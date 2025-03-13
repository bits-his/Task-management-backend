import {
  createComment,
  deleteCommentById,
  getCommentsByTaskId,
  updateCommentById,
} from "../controllers/comments.controller";

module.exports = (app) => {
  app.post("/api/comments", createComment);
  app.get("/api/comments/task/:task_id", getCommentsByTaskId);
  app.post("/api/comments/delete/:id", deleteCommentById);
  app.put("/api/comments/task/:id", updateCommentById);
};
