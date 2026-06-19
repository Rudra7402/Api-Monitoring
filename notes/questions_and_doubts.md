## 📋 Doubts & Answers

### 1)what is the need of this telling or writting that mode is either production or development not able to understand usecase? @(index.js)

sol)  app.post("/login", async (req, res) => {
   try {
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
         throw new Error("User not found in database");
      }

      res.send("Login success");

   } catch (error) {

      if (process.env.NODE_ENV === "development") {

         res.status(500).json({
            message: error.message,
            stack: error.stack
         });

      } else {

         res.status(500).json({
            message: "Something went wrong"
         });

      }
   }
});

Development Mode
NODE_ENV=development

Browser/Postman response:

{
   "message": "User not found in database",
   "stack": "Error: User not found..."
}

Tumhe exact issue mil gaya:

error kaha aya
kis line pe aya
debugging easy
Production Mode
NODE_ENV=production

Response:

{
   "message": "Something went wrong"
}

Ab:

hacker ko internal info nahi mili
database structure hide raha
stack trace hide raha

### 2) queue name kyu dia jata h kyunki hoskta h multiple quese means mupliple collections hoe(agr hm mongodb ke terms me bat kre for easy understanding) jisse use pta rhe konse queue me data bhejna h and konse queue se data lena h right?
sol) Tum MongoDB analogy sahi use kar rahe ho understanding ke liye.

RabbitMQ me multiple queues ho sakti hain, isliye queue name diya jata hai taaki:

producer ko pata ho message kaha bhejna hai
consumer ko pata ho kaha se lena hai
MongoDB Analogy

MongoDB:

Database
   ├── users collection
   ├── problems collection
   └── submissions collection

RabbitMQ:

RabbitMQ
   ├── api_hits queue
   ├── emails queue
   └── notifications queue



### 3) what is the meaning of this terminology:- modular monolith folder structure?

Pehle Monolith samjho

Monolith:

Ek single backend application

Example:

CodeArena Backend

isme:

auth
problems
submissions
contests

sab ek hi server/project me hote hain.

Problem with bad monolith

Agar structure messy ho:

controllers/
models/
routes/
utils/
helpers/

Sab mixed.

Features alag nahi.

Code scale hote hi:

confusion
dependency issues
spaghetti code
Modular Monolith kya karta hai?

Ye same monolith ko internally modules me organize karta hai.

Example:

src/
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.routes.js
│   │   └── auth.model.js
│   │
│   ├── problems/
│   │   ├── problem.controller.js
│   │   ├── problem.service.js
│   │   └── ...
│   │
│   └── submissions/
│
├── shared/
├── config/
└── app.js
Ye "modular" kyu hai?

Because har feature isolated module hai.

Example:

auth ka code mostly auth folder me
problems ka code problems folder me
Ye "monolith" kyu hai?

Because:

sab ek hi backend app me chal raha
ek hi deployment
ek hi codebase
ek hi server

NOT separate services.