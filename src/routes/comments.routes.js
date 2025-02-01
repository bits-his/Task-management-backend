import { createComment, getCommentsByTaskId } from '../controllers/comments.controller';

module.exports = (app) => {
  // Create a new comment
  app.post('/api/comments', createComment);
  
  // Get all comments for a specific task
  app.get('/api/comments/task/:task_id', getCommentsByTaskId);
};
