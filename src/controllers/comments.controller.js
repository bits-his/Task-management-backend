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

    if (!task_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required parameter: task_id',
        },
      });
    }

    // Get comments with user information
    const taskComments = await comments.findAll({
      where: { task_id },
      include: [{
        model: users,
        as: 'users',
        attributes: ['user_id', 'fullname', 'email'],
      }],
      order: [['date', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: taskComments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching comments',
        details: error.message,
      },
    });
  }
};

export { createComment, getCommentsByTaskId };
