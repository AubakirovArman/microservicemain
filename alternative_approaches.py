from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Set, List, Tuple
import uvicorn
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import logging
import time
from contextlib import asynccontextmanager
import os
from difflib import SequenceMatcher
from collections import Counter
import string

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Глобальные переменные для кэширования
tfidf_vectorizer = None
phrases_list = None
phrases_tfidf_matrix = None

# База фраз автоответчиков (используем ту же базу)
phrases_db: Set[str] = {
    "Здравствуйте это сбербанк я ваш виртуальный ассистент",
    "Буквально секундочку не совсем понимаю вас",
    "Можно ли соединить со специалистом",
    "Мхатовскую паузу",
    "Поиграем сейчас я сделаю мхатовскую паузу если не успеете положить трубку то вы проиграли вы проиграли до свидания",
    "Секундочку связь шалит продолжайте",
    "Я слышу тишину",
    "Ласковое слово дороже рубля"
}

class TextPreprocessor:
    """Класс для предобработки текста"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Очистка и нормализация текста"""
        # Приведение к нижнему регистру
        text = text.lower()
        
        # Удаление знаков препинания
        text = text.translate(str.maketrans('', '', string.punctuation))
        
        # Удаление лишних пробелов
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    @staticmethod
    def get_words(text: str) -> List[str]:
        """Получение списка слов из текста"""
        cleaned = TextPreprocessor.clean_text(text)
        return cleaned.split()

class SimilarityCalculator:
    """Класс для вычисления различных метрик схожести"""
    
    @staticmethod
    def jaccard_similarity(text1: str, text2: str) -> float:
        """Вычисление коэффициента Жаккара"""
        words1 = set(TextPreprocessor.get_words(text1))
        words2 = set(TextPreprocessor.get_words(text2))
        
        if not words1 and not words2:
            return 1.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    @staticmethod
    def sequence_similarity(text1: str, text2: str) -> float:
        """Вычисление схожести последовательностей"""
        clean1 = TextPreprocessor.clean_text(text1)
        clean2 = TextPreprocessor.clean_text(text2)
        
        return SequenceMatcher(None, clean1, clean2).ratio()
    
    @staticmethod
    def word_overlap_similarity(text1: str, text2: str) -> float:
        """Вычисление схожести на основе пересечения слов"""
        words1 = TextPreprocessor.get_words(text1)
        words2 = TextPreprocessor.get_words(text2)
        
        if not words1 and not words2:
            return 1.0
        
        counter1 = Counter(words1)
        counter2 = Counter(words2)
        
        # Вычисляем пересечение с учетом частоты
        intersection = sum((counter1 & counter2).values())
        total = sum(counter1.values()) + sum(counter2.values())
        
        return (2 * intersection) / total if total > 0 else 0.0
    
    @staticmethod
    def length_weighted_similarity(text1: str, text2: str) -> float:
        """Схожесть с учетом длины текста"""
        # Комбинируем несколько метрик
        jaccard = SimilarityCalculator.jaccard_similarity(text1, text2)
        sequence = SimilarityCalculator.sequence_similarity(text1, text2)
        word_overlap = SimilarityCalculator.word_overlap_similarity(text1, text2)
        
        # Учитываем длину - короткие фразы должны иметь меньший вес
        len1 = len(TextPreprocessor.get_words(text1))
        len2 = len(TextPreprocessor.get_words(text2))
        
        # Штраф за слишком короткие фразы
        length_penalty = 1.0
        if min(len1, len2) < 3:  # Если одна из фраз содержит менее 3 слов
            length_penalty = 0.5
        elif min(len1, len2) < 5:  # Если одна из фраз содержит менее 5 слов
            length_penalty = 0.7
        
        # Взвешенная комбинация метрик
        combined_score = (jaccard * 0.3 + sequence * 0.3 + word_overlap * 0.4) * length_penalty
        
        return combined_score

def initialize_tfidf():
    """Инициализация TF-IDF векторизатора"""
    global tfidf_vectorizer, phrases_list, phrases_tfidf_matrix
    
    logger.info("Инициализация TF-IDF векторизатора...")
    start_time = time.time()
    
    try:
        # Конвертируем set в list для индексации
        phrases_list = list(phrases_db)
        
        # Предобрабатываем фразы
        cleaned_phrases = [TextPreprocessor.clean_text(phrase) for phrase in phrases_list]
        
        # Создаем TF-IDF векторизатор
        tfidf_vectorizer = TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 3),  # Используем униграммы, биграммы и триграммы
            max_features=10000,
            stop_words=None  # Не используем стоп-слова для русского языка
        )
        
        # Вычисляем TF-IDF матрицу для всех фраз
        phrases_tfidf_matrix = tfidf_vectorizer.fit_transform(cleaned_phrases)
        
        load_time = time.time() - start_time
        logger.info(f"TF-IDF инициализация завершена за {load_time:.2f} секунд")
        
    except Exception as e:
        logger.error(f"Ошибка при инициализации TF-IDF: {e}")
        raise

def find_most_similar_tfidf(query_text: str, threshold: float = 0.5) -> Tuple[bool, float, str]:
    """Поиск наиболее похожей фразы с использованием TF-IDF"""
    if tfidf_vectorizer is None or phrases_tfidf_matrix is None:
        return False, 0.0, ""
    
    try:
        # Предобрабатываем запрос
        cleaned_query = TextPreprocessor.clean_text(query_text)
        
        # Векторизуем запрос
        query_tfidf = tfidf_vectorizer.transform([cleaned_query])
        
        # Вычисляем косинусное сходство
        similarities = cosine_similarity(query_tfidf, phrases_tfidf_matrix)[0]
        
        # Находим максимальное сходство
        max_similarity_idx = np.argmax(similarities)
        max_similarity = similarities[max_similarity_idx]
        
        if max_similarity >= threshold:
            matched_phrase = phrases_list[max_similarity_idx]
            return True, float(max_similarity), matched_phrase
        else:
            return False, float(max_similarity), ""
            
    except Exception as e:
        logger.error(f"Ошибка при поиске схожести: {e}")
        return False, 0.0, ""

def find_most_similar_combined(query_text: str, threshold: float = 0.5) -> Tuple[bool, float, str]:
    """Поиск наиболее похожей фразы с использованием комбинированного подхода"""
    if not phrases_list:
        return False, 0.0, ""
    
    try:
        max_similarity = 0.0
        best_match = ""
        
        # Проверяем каждую фразу в базе
        for phrase in phrases_list:
            # Используем комбинированную метрику
            similarity = SimilarityCalculator.length_weighted_similarity(query_text, phrase)
            
            if similarity > max_similarity:
                max_similarity = similarity
                best_match = phrase
        
        if max_similarity >= threshold:
            return True, max_similarity, best_match
        else:
            return False, max_similarity, ""
            
    except Exception as e:
        logger.error(f"Ошибка при поиске схожести: {e}")
        return False, 0.0, ""

# Пример использования разных подходов
def test_approaches():
    """Тестирование различных подходов"""
    test_phrases = [
        "фывапролджэ ячсмитьбю",  # Случайные символы
        "Здравствуйте это сбербанк",  # Частичное совпадение
        "Мхатовская пауза",  # Близко к "Мхатовскую паузу"
        "абракадабра несуществующие слова"
    ]
    
    print("Тестирование различных подходов:\n")
    
    for phrase in test_phrases:
        print(f"Тестовая фраза: '{phrase}'")
        
        # TF-IDF подход
        tfidf_match, tfidf_score, tfidf_phrase = find_most_similar_tfidf(phrase, 0.3)
        print(f"  TF-IDF: {tfidf_score:.4f} - {'Совпадение' if tfidf_match else 'Нет совпадения'} - '{tfidf_phrase}'")
        
        # Комбинированный подход
        combined_match, combined_score, combined_phrase = find_most_similar_combined(phrase, 0.3)
        print(f"  Комбинированный: {combined_score:.4f} - {'Совпадение' if combined_match else 'Нет совпадения'} - '{combined_phrase}'")
        
        print()

if __name__ == "__main__":
    # Инициализация
    phrases_list = list(phrases_db)
    initialize_tfidf()
    
    # Тестирование
    test_approaches()