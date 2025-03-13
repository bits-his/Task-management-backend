import db from "../models";

export const createPost = async (req, res) => {
  try {
    const {
      author_id,
      timestamp,
      type,
      title,
      content,
      likes = 0,
      is_liked = false,
      is_saved = false,
    } = req.body;

    let media = [];
    if (req.files) {
      media = await Promise.all(
        req.files.map(async (file) => {
          const mediaItem = {
            type: file.mimetype.startsWith("image") ? "image" : "video",
            url: file.path,
            thumbnail_url: null,
          };

          if (mediaItem.type === "video") {
            const thumbnailPath = `thumbnail-${Date.now()}.jpg`;
            await generateThumbnail(file.path, thumbnailPath);
            mediaItem.thumbnail_url = thumbnailPath;
          }

          return mediaItem;
        })
      );
    }

    console.log("Media:", media);

    const resp = await db.sequelize.query(
      `CALL create_post(:author_id, :timestamp, :type, :title, :content, :media, :likes, :is_liked, :is_saved)`,
      {
        replacements: {
          author_id:author_id,
          timestamp:"2017-06-06 12:10:12",
          type,
          title,
          content,
          media: JSON.stringify(media),
          likes,
          is_liked,
          is_saved,
        },
      }
    );

    console.log("Query Response:", resp);
    res.json({ success: true, data: resp });
  } catch (err) {
    console.error("Error:", err);
    res.json({ success: false, message: err.message });
  }
};


export const addComment = (req, res) => {
  const { post_id, author_id, content, timestamp, likes = 0 } = req.body;
  console.log("Request Body:", req.body); // Log the request body

  db.sequelize
    .query(`CALL add_comment_post(:post_id, :author_id, :content, :timestamp, :likes)`, {
      replacements: {
        post_id,
        author_id,
        content,
        timestamp:"2017-06-06 12:10:12",
        likes,
      },
    })
    .then((resp) => {
      console.log("Query Response:", resp); // Log the response
      res.json({ success: true, data: resp });
    })
    .catch((err) => {
      console.error("Query Error:", err); // Log the error
      res.json({ success: false, message: err });
    });
};



export const addLike = (req, res) => {
  const { post_id, comment_id=0, user_id } = req.body;
  console.log("Request Body:", req.body);
  db.sequelize
    .query(`CALL add_like(:post_id, :comment_id, :user_id)`, {
      replacements: {
        post_id,
        comment_id,
        user_id,
      },
    })
    .then((resp) => {
      console.log("Query Response:", resp); 
      res.json({ success: true, data: resp });
    })
    .catch((err) => {
      console.error("Query Error:", err);
      res.json({ success: false, message: err });
    });
};

export const savePost = (req, res) => {
  const { post_id, user_id } = req.body;

  db.sequelize
    .query(`CALL save_post(:post_id, :user_id)`, {
      replacements: {
        post_id,
        user_id,
      },
    })
    .then((resp) => {
      res.json({ success: true, data: resp });
    })
    .catch((err) => {
      res.json({ success: false, message: err });
    });
};


export const getAllPosts = (req, res) => {
  const {user_id=null}=req.query;
  db.sequelize
    .query(`CALL get_all_posts("${user_id}")`)
    .then((resp) => {
      res.json({ success: true, data: resp });
    })
    .catch((err) => {
      res.json({ success: false, message: err });
    });
};




export const getOrganizationTree = (req, res) =>{

  db.sequelize.query(`SELECT * FROM organization_chart`)
  .then((resp) => {
    res.json({ success: true, data: resp });
  })
  .catch((err) => {
    res.json({ success: false, message: err });
  });

}