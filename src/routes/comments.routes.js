import { createComment, deleteCommentByUserId, getCommentsByTaskId } from '../controllers/comments.controller';

module.exports = (app) => {

  app.post('/api/comments', createComment);

  app.get('/api/comments/task/:task_id', getCommentsByTaskId);
  app.delete("/api/comments/task/:user_id", deleteCommentByUserId);
};
