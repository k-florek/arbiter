CREATE TABLE users (
	username	TEXT NOT NULL UNIQUE,
	password	TEXT NOT NULL,
	PRIMARY KEY(username)
)
INSERT or IGNORE INTO users (username,password) VALUES ('admin','$2b$10$wspkF5Bh1Yx5YwoEfm8S3erXmQGD.ffBnaYbHJWogIiTIjoY.0NEC')
