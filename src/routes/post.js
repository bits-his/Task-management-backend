import {
  createPost,
  addComment,
  addLike,
  savePost,
  getAllPosts,
} from "../controllers/post.js";
import {
  getOrganizationTree,
  createOrganizationNode,
  updateOrganizationNode,
  deleteOrganizationNode,
} from "../controllers/organizationChart.js";
import { upload } from "../config/multerConfig.js";

export default (app) => {
  app.post("/api/posts", upload.array("files", 5), createPost);
  app.post("/posts/comment", addComment);
  app.post("/posts/like", addLike);
  app.post("/posts/save", savePost);
  app.get("/posts", getAllPosts);

  app.get("/getorganizationtree", getOrganizationTree);
  app.post("/organization-chart", createOrganizationNode);
  app.put("/organization-chart", updateOrganizationNode);
  app.delete("/organization-chart/:head", deleteOrganizationNode);
};
