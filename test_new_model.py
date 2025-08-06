import requests
import json

# URL сервиса
url = "http://localhost:8001/check_phrase"

# Тестовые фразы
test_phrases = [
    "фывапролджэ ячсмитьбю",  # Проблемная фраза, которая раньше давала высокий similarity score
    "абракадабра несуществующие слова тест",
    "qwerty asdfgh zxcvbn",
    "random nonsense words here",
    "123456789 !@#$%^&*()",
    "Здравствуйте это сбербанк я ваш виртуальный ассистент"  # Реальная фраза из базы
]

# Тестирование с разными порогами
thresholds = [0.5, 0.7, 0.8, 0.9, 0.95]

print("Тестирование новой модели paraphrase-multilingual-mpnet-base-v2\n")

for phrase in test_phrases:
    print(f"Фраза: '{phrase}'")
    
    for threshold in thresholds:
        # Подготовка данных запроса
        data = {
            "phrase": phrase,
            "threshold": threshold
        }
        
        # Отправка запроса
        try:
            response = requests.post(url, json=data)
            result = response.json()
            
            # Вывод результата
            print(f"  Порог {threshold:.2f}: ")
            print(f"    Определено как автоответчик: {result['is_answering_machine']}")
            print(f"    Similarity score: {result['similarity_score']:.4f}")
            if result['matched_phrase']:
                print(f"    Совпадение с фразой: '{result['matched_phrase']}'")
            print()
            
        except Exception as e:
            print(f"  Ошибка при threshold={threshold}: {e}\n")
    
    print("-" * 80)