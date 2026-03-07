package models

import "time"

type User struct {
	ID        string    `json:"id" bson:"_id"`
	Email     string    `json:"email" bson:"email"`
	Fullname  string    `json:"fullname" bson:"fullname"`
	Picture   string    `json:"picture" bson:"picture"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}
