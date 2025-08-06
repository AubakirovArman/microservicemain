import requests
import json

# Тестируем с несуществующими словами
test_phrases = [
    "абракадабра несуществующие слова тест",
    "qwerty asdfgh zxcvbn",
    "фывапролджэ ячсмитьбю",
    "random nonsense words here",
    "123456789 !@#$%^&*()"
]

url = "http://localhost:8001/check_phrase"

for phrase in test_phrases:
    data = {"phrase": phrase}
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"Фраза: '{phrase}'")
            print(f"Similarity score: {result['similarity_score']:.4f}")
            print(f"Is answering machine: {result['is_answering_machine']}")
            if result['matched_phrase']:
                print(f"Matched phrase: '{result['matched_phrase']}'")
            print("-" * 50)
        else:
            print(f"Ошибка {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Ошибка при запросе: {e}")