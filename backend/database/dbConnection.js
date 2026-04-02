import mongoose from "mongoose"; //just mongoose import!
import dotenv from "dotenv"
dotenv.config()

//Database connection here!
 const dbConnection  = ()=>{
    mongoose.connect(process.env.DB_URL,{
       dbName: "Job_Portal"

    }).then(async ()=>{ //agar connect ho jaye toh!
       console.log("MongoDB Connected Sucessfully !")

       // Fix index lỗi: xóa index cũ sai trên collection applications
       try {
         const db = mongoose.connection.db;
         const collection = db.collection("applications");
         const indexes = await collection.indexes();

         // Tìm và xóa index unique SAI (chỉ có applicantID.user mà không có jobId)
         for (const idx of indexes) {
           if (idx.unique && idx.key["applicantID.user"] && !idx.key["jobId"]) {
             console.log("Phát hiện index unique lỗi, đang xóa:", idx.name);
             await collection.dropIndex(idx.name);
             console.log("Đã xóa index lỗi:", idx.name);
           }
         }

         // Đảm bảo compound index đúng tồn tại
         await collection.createIndex(
           { "applicantID.user": 1, jobId: 1 },
           { unique: true, name: "applicantID.user_1_jobId_1" }
         );
         console.log("Index application đã được đảm bảo đúng.");
       } catch (indexErr) {
         // Không chặn app khởi động nếu fix index thất bại
         console.warn("Cảnh báo khi fix index:", indexErr.message);
       }
    }).catch((error)=>{
        console.log(`Failed to connect ${error}`) //warna error de do console me!
    })

}
export default dbConnection;