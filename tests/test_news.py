from app.news_crawler import fetch_news


def test_fetch_news():
    news_list = fetch_news("삼성전자", display=10)

    print("Fetched News Count:", len(news_list))

    for news in news_list:
        print("=" * 50)
        print("Score:", news["score"])
        print("Title:", news["title"])
        print("Description:", news["description"])
        print("Link:", news["link"])
        print("PubDate:", news["pubDate"])


if __name__ == "__main__":
    test_fetch_news()