import db from "../models";
const { comments, users } = db;

const createComment = async (req, res) => {
  try {
    const { user_id, task_id, description } = req.body;

    // Validate required fields
    if (!user_id || !task_id || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required fields: user_id, task_id, description',
        },
      });
    }

    // Create comment
    const comment = await comments.create({
      user_id,
      task_id,
      description,
      date: new Date(),
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating the comment',
        details: error.message,
      },
    });
  }
};

const getCommentsByTaskId = async (req, res) => {
  try {
    const { task_id } = req.params;
    console.log('Fetching comments for task_id:', task_id);

    if (!task_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required parameter: task_id',
        },
      });
    }

    // First, check if any comments exist for this task
    const commentCount = await comments.count({
      where: { task_id }
    });
    console.log('Number of comments found:', commentCount);

    const taskComments = await comments.findAll({
      where: { task_id },
      include: [{
        model: users,
        as: 'users',
        attributes: ['user_id', 'fullname', 'email']
      }],
      order: [['date', 'ASC']],
      logging: console.log // This will log the actual SQL query
    });

    console.log('Query results:', JSON.stringify(taskComments, null, 2));

    res.status(200).json({
      success: true,
      data: taskComments,
      debug: {
        commentCount,
        task_id
      }
    });
  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching comments',
        details: error.message,
        stack: error.stack
      },
    });
  }
};

export { createComment, getCommentsByTaskId };
