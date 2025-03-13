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
          code: "BAD_REQUEST",
          message: "Missing required fields: user_id, task_id, description",
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
        code: "SERVER_ERROR",
        message: "An error occurred while creating the comment",
        details: error.message,
      },
    });
  }
};

const getCommentsByTaskId = async (req, res) => {
  try {
    const { task_id } = req.params;
    // console.log("Fetching comments for task_id:", task_id);

    if (!task_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing required parameter: task_id",
        },
      });
    }

    // First, check if any comments exist for this task
    const commentCount = await comments.count({
      where: { task_id },
    });
    console.log("Number of comments found:", commentCount);

    const taskComments = await comments.findAll({
      where: { task_id },
      include: [
        {
          model: users,
          as: "users",
          attributes: ["user_id", "fullname", "email"],
        },
      ],
      order: [["date", "ASC"]],
      logging: console.log, // This will log the actual SQL query
    });

    console.log("Query results:", JSON.stringify(taskComments, null, 2));

    res.status(200).json({
      success: true,
      data: taskComments,
      debug: {
        commentCount,
        task_id,
      },
    });
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while fetching comments",
        details: error.message,
        stack: error.stack,
      },
    });
  }
};

const deleteCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing required parameter: id",
        },
      });
    }

    // Check if the comment exists
    const comment = await comments.findOne({ where: { id } });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Delete the comment
    await comments.destroy({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while deleting the comment",
        details: error.message,
      },
    });
  }
};

const updateCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    // console.log(`Updating comment ${id}`);

    if (!id || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing required parameters: id or description",
        },
      });
    }

    // Find the comment
    const comment = await comments.findOne({ where: { id } });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Update the comment
    await comment.update({ description });

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while updating the comment",
        details: error.message,
        stack: error.stack,
      },
    });
  }
};

export {
  createComment,
  getCommentsByTaskId,
  deleteCommentById,
  updateCommentById,
};
