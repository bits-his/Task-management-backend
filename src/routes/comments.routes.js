import { createComment, getCommentsByTaskId } from '../controllers/comments.controller';

module.exports = (app) => {

  app.post('/api/comments', createComment);
  

  app.get('/api/comments/task/:task_id', getCommentsByTaskId);
};
