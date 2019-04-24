CREATE TABLE users (
	username	TEXT NOT NULL UNIQUE,
	password	TEXT NOT NULL,
	PRIMARY KEY(username)
)
