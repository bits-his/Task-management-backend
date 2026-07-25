import { postExcuse } from "../controllers/excuse.js";
export default (app)=>{
    app.post("/app/post-excuse",postExcuse)
}