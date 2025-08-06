import requests
import json

def test_phrase_with_threshold(phrase, threshold):
    """Тестирует фразу с определенным порогом"""
    url = "http://localhost:8001/check_phrase"
    data = {
        "phrase": phrase,
        "threshold": threshold
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            print(f"Ошибка {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"Ошибка запроса: {e}")
        return None

def main():
    # Тестовые фразы - случайные/несуществующие слова
    test_phrases = [
        "фывапролджэ ячсмитьбю",  # Проблемная фраза
        "абракадабра несуществующие слова тест",
        "qwerty asdfgh zxcvbn",
        "random nonsense words here",
        "123456789 !@#$%^&*()",
        "zxcvbnm qwertyuiop"
    ]
    
    # Тестируем разные пороги
    thresholds = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
    
    print("=== ТЕСТИРОВАНИЕ РАЗНЫХ ПОРОГОВ ===")
    print()
    
    for phrase in test_phrases:
        print(f"\nФраза: '{phrase}'")
        print("-" * 60)
        
        for threshold in thresholds:
            result = test_phrase_with_threshold(phrase, threshold)
            if result:
                is_match = result['is_answering_machine']
                score = result['similarity_score']
                matched = result.get('matched_phrase', 'N/A')
                
                status = "✓ MATCH" if is_match else "✗ NO MATCH"
                print(f"Порог {threshold:4.2f}: {status} | Score: {score:.4f} | Matched: '{matched[:50]}{'...' if len(matched) > 50 else ''}'")
        
        print()
    
    # Тестируем настоящие фразы автоответчика
    print("\n=== ТЕСТИРОВАНИЕ НАСТОЯЩИХ ФРАЗ АВТООТВЕТЧИКА ===")
    real_phrases = [
        "Здравствуйте это сбербанк я ваш виртуальный ассистент",
        "Секундочку связь шалит продолжайте",
        "Я слышу тишину"
    ]
    
    for phrase in real_phrases:
        print(f"\nФраза: '{phrase}'")
        print("-" * 60)
        
        for threshold in [0.7, 0.8, 0.9]:
            result = test_phrase_with_threshold(phrase, threshold)
            if result:
                is_match = result['is_answering_machine']
                score = result['similarity_score']
                matched = result.get('matched_phrase', 'N/A')
                
                status = "✓ MATCH" if is_match else "✗ NO MATCH"
                print(f"Порог {threshold:4.2f}: {status} | Score: {score:.4f} | Matched: '{matched[:50]}{'...' if len(matched) > 50 else ''}'")

if __name__ == "__main__":
    main()