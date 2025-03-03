import express from "express";
import {
  createPost,
  addComment,
  addLike,
  savePost,
  getAllPosts,
  getOrganizationTree,
} from "../controllers/post";
const { upload } = require("../config/multerConfig");

module.exports = (app)=>{

app.post("/api/posts", upload.array('files', 5), createPost);


app.post("/posts/comment", addComment);


app.post("/posts/like", addLike);

app.post("/posts/save", savePost);

app.get("/posts", getAllPosts);
app.get("/getorganizationtree", getOrganizationTree);
}



