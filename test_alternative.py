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
    "Здравствуйте это сбербанк я ваш виртуальный ассистент",  # Реальная фраза из базы
    "Мхатовская пауза",  # Близко к "Мхатовскую паузу"
    "Секундочку связь шалит",  # Частичное совпадение
    "Алло алло я слушаю"  # Точное совпадение
]

# Тестирование с разными порогами
thresholds = [0.3, 0.5, 0.7, 0.8, 0.9]

print("Тестирование альтернативного сервиса (без нейронных сетей)\n")
print("=" * 80)

for phrase in test_phrases:
    print(f"\nФраза: '{phrase}'")
    print("-" * 60)
    
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
            status = "✅ АВТООТВЕТЧИК" if result['is_answering_machine'] else "❌ НЕ АВТООТВЕТЧИК"
            print(f"  Порог {threshold:.1f}: {status} (score: {result['similarity_score']:.4f})")
            if result['matched_phrase']:
                print(f"           Совпадение: '{result['matched_phrase']}'")
            
        except Exception as e:
            print(f"  Ошибка при threshold={threshold}: {e}")
    
    print()

print("=" * 80)
print("\nСравнение результатов:")
print("- Случайные символы должны давать низкие scores")
print("- Реальные фразы автоответчиков должны давать высокие scores")
print("- Частичные совпадения должны давать средние scores")