from gensim import corpora
from gensim.models import LdaModel
from gensim.utils import simple_preprocess
from nltk.corpus import stopwords
import nltk
import sys

nltk.download('stopwords')
stop_words = set(stopwords.words('english'))


class TopicModeling:
    def __init__(self, docs):
        self.docs = docs
        self.topic_data = []

    def print_topics(self, documents, topics):
        """ Print the topics associated with each document. """
        for i, data in enumerate(topics):
            print(f"{documents[i]}: {data}")

    def preprocess(self, text):
        """
        Preprocess using gensim's simple_preprocess function.
        """
        return [word for word in simple_preprocess(text) if word not in stop_words]

    def perform_topic_modeling(self, num_topics=5, threshold=0.1):
        """
        Perform topic modeling on a collection of documents using Latent Dirichlet Allocation (LDA).
        """
        processed_docs = [self.preprocess(doc) for doc in self.docs]
        dictionary = corpora.Dictionary(processed_docs)
        corpus = [dictionary.doc2bow(doc) for doc in processed_docs]
        lda_model = LdaModel(corpus=corpus, id2word=dictionary,
                             num_topics=num_topics, passes=15)

        document_topics = []
        for doc_bow in corpus:
            topics = []
            doc_topics = lda_model.get_document_topics(doc_bow)

            for topic_id, score in doc_topics:
                if score > threshold:
                    topic_words = lda_model.show_topic(topic_id, topn=3)

                    for word, _ in topic_words:
                        topics.append(word)

            document_topics.append(topics)
        return document_topics

    def run(self):
        topics = self.perform_topic_modeling()
        self.print_topics(self.docs, topics)


# if __name__ == "__main__":
documents = [
    "Artem Zymovets chef",
    "Python is a popular programming language for data science and artificial intelligence.",
    "Natural language processing is a subfield of linguistics, computer science, and artificial intelligence.",
    "Deep learning is part of a broader family of machine learning methods based on artificial neural networks.",
    "Data mining is the process of discovering patterns in large data sets involving methods at the intersection of machine learning, statistics, and database systems."
]
print('hello')

topic_model = TopicModeling(documents)
topic_model.run()
sys.stdout.flush()
