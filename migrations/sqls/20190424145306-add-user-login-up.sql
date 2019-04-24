CREATE TABLE users (
	username	TEXT NOT NULL UNIQUE,
	password	TEXT NOT NULL,
	PRIMARY KEY(username)
);
INSERT INTO `users` VALUES ('admin','$2b$10$wspkF5Bh1Yx5YwoEfm8S3erXmQGD.ffBnaYbHJWogIiTIjoY.0NEC');
