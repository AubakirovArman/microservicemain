import requests
import json
from main_alternative import phrases_db, SimilarityCalculator, TextPreprocessor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Тестируем локально все алгоритмы
query = "летсгоу"
print(f"Анализ фразы: '{query}'")
print("=" * 80)

# Получаем все фразы из базы
phrases_list = list(phrases_db)
print(f"Всего фраз в базе: {len(phrases_list)}")
print()

# Проверяем, есть ли "Преторьева" в базе
pretor_phrases = [p for p in phrases_list if 'преторьева' in p.lower() or 'Преторьева' in p]
print(f"Фразы с 'Преторьева': {pretor_phrases}")
print()

# Тестируем все алгоритмы similarity
results = []

for phrase in phrases_list:
    # Jaccard similarity
    jaccard = SimilarityCalculator.jaccard_similarity(query, phrase)
    
    # Sequence similarity
    sequence = SimilarityCalculator.sequence_similarity(query, phrase)
    
    # Word overlap similarity
    word_overlap = SimilarityCalculator.word_overlap_similarity(query, phrase)
    
    # Length weighted similarity (комбинированный)
    length_weighted = SimilarityCalculator.length_weighted_similarity(query, phrase)
    
    results.append({
        'phrase': phrase,
        'jaccard': jaccard,
        'sequence': sequence,
        'word_overlap': word_overlap,
        'length_weighted': length_weighted
    })

# Сортируем по length_weighted (это то, что использует система)
results.sort(key=lambda x: x['length_weighted'], reverse=True)

print("Топ-10 фраз по length_weighted similarity:")
print("-" * 120)
print(f"{'№':<3} {'Length Weighted':<15} {'Jaccard':<10} {'Sequence':<10} {'Word Overlap':<12} {'Фраза':<50}")
print("-" * 120)

for i, result in enumerate(results[:10], 1):
    phrase = result['phrase'][:47] + '...' if len(result['phrase']) > 50 else result['phrase']
    print(f"{i:<3} {result['length_weighted']:<15.4f} {result['jaccard']:<10.4f} {result['sequence']:<10.4f} {result['word_overlap']:<12.4f} {phrase}")

print()
print("Проверяем TF-IDF:")
print("-" * 50)

# Тестируем TF-IDF
cleaned_phrases = [TextPreprocessor.clean_text(phrase) for phrase in phrases_list]
cleaned_query = TextPreprocessor.clean_text(query)

tfidf_vectorizer = TfidfVectorizer(
    analyzer='word',
    ngram_range=(1, 3),
    max_features=10000,
    stop_words=None
)

phrases_tfidf_matrix = tfidf_vectorizer.fit_transform(cleaned_phrases)
query_tfidf = tfidf_vectorizer.transform([cleaned_query])
similarities = cosine_similarity(query_tfidf, phrases_tfidf_matrix)[0]

max_tfidf_idx = np.argmax(similarities)
max_tfidf_similarity = similarities[max_tfidf_idx]
best_tfidf_phrase = phrases_list[max_tfidf_idx]

print(f"Лучшее TF-IDF совпадение: '{best_tfidf_phrase}' (score: {max_tfidf_similarity:.4f})")

# Топ-5 TF-IDF результатов
tfidf_results = [(phrases_list[i], similarities[i]) for i in range(len(phrases_list))]
tfidf_results.sort(key=lambda x: x[1], reverse=True)

print("\nТоп-5 TF-IDF результатов:")
for i, (phrase, score) in enumerate(tfidf_results[:5], 1):
    phrase_short = phrase[:60] + '...' if len(phrase) > 63 else phrase
    print(f"{i}. {score:.4f} - {phrase_short}")

print("\n" + "=" * 80)
print("ИТОГОВЫЙ АНАЛИЗ:")
print(f"Система должна вернуть: '{results[0]['phrase']}' с score {results[0]['length_weighted']:.4f}")

# Проверяем через API
print("\nПроверка через API:")
try:
    response = requests.post('http://localhost:8001/check_phrase', 
                           json={'phrase': query, 'threshold': 0.5})
    if response.status_code == 200:
        api_result = response.json()
        print(f"API вернул: '{api_result['matched_phrase']}' с score {api_result['similarity_score']:.4f}")
        
        if api_result['matched_phrase'] != results[0]['phrase']:
            print("⚠️  НЕСООТВЕТСТВИЕ! API вернул другую фразу!")
        else:
            print("✅ API работает корректно")
    else:
        print(f"Ошибка API: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Ошибка при обращении к API: {e}")