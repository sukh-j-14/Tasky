# Tasky - Indian Freelancing Platform

A comprehensive freelancing platform built for the Indian market, allowing users to post tasks, bid on projects, and manage payments with a ₹1 platform fee system.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login/signup with JWT tokens
- **Task Management**: Post, browse, and manage tasks
- **Bidding System**: Freelancers can bid on tasks with competitive pricing
- **Payment System**: Escrow-based payments with ₹1 platform fee
- **Profile Management**: Complete user profiles with picture upload
- **Real-time Messaging**: Communication between clients and freelancers

### Indian Market Focus
- **Currency**: All transactions in Indian Rupees (₹)
- **Platform Fee**: ₹1 fee per transaction (affordable for Indian users)
- **User-Friendly**: Simple interface suitable for Indian users
- **Mobile Responsive**: Works on all devices

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing

### Frontend
- **HTML5** with Tailwind CSS
- **Vanilla JavaScript** (ES6+)
- **Font Awesome** icons
- **Responsive Design**

## 📁 Project Structure

```
Tasky 2/
├── controllers/          # Business logic
│   ├── authController.js
│   ├── bidController.js
│   ├── paymentController.js
│   └── messageController.js
├── models/              # Database models
│   ├── User.js
│   ├── Task.js
│   ├── Bid.js
│   ├── Payment.js
│   └── Message.js
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   ├── bidRoutes.js
│   ├── paymentRoutes.js
│   └── messageRoutes.js
├── middlewars/          # Middleware functions
│   └── auth.middleware.js
├── views/               # Frontend pages
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── posttask.html
│   ├── browsetask.html
│   ├── mytasks.html
│   ├── task-detail.html
│   ├── task-bids.html
│   └── shared/
│       ├── navigation.js
│       └── navigation.html
├── uploads/             # File uploads
├── server.js            # Main server file
├── package.json
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Tasky\ 2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/tasky
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=development
   PORT=5001
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   npm start
   ```

6. **Access the application**
   Open your browser and go to `http://localhost:5001`

## 📱 Pages & Features

### Public Pages
- **Home Page** (`index.html`): Landing page with task posting and browsing
- **Login** (`login.html`): User authentication
- **Signup** (`signup.html`): New user registration

### Protected Pages
- **Dashboard** (`dashboard.html`): User overview and statistics
- **Profile** (`profile.html`): User profile management with picture upload
- **Post Task** (`posttask.html`): Create new tasks
- **Browse Tasks** (`browsetask.html`): Search and filter available tasks
- **My Tasks** (`mytasks.html`): Manage posted tasks and bids
- **Task Details** (`task-detail.html`): View task details and place bids
- **Task Bids** (`task-bids.html`): Manage bids for posted tasks

## 💰 Payment System

### How it Works
1. **Client posts task** with budget
2. **Freelancers bid** on the task
3. **Client accepts bid** and pays (bid amount + ₹1 platform fee)
4. **Payment is escrowed** until task completion
5. **Client marks task complete** to release payment
6. **Freelancer receives** bid amount, platform keeps ₹1

### Platform Fee
- **Fixed fee**: ₹1 per transaction
- **Affordable**: Suitable for Indian market
- **Transparent**: Clear fee structure

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Image-only uploads with size limits
- **CORS Protection**: Configured for production security

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, professional design with Tailwind CSS
- **User-Friendly**: Intuitive navigation and clear CTAs
- **Consistent Branding**: Purple theme throughout the platform
- **Loading States**: Proper loading indicators and error handling

## 🚀 Deployment

The repository includes a `render.yaml` blueprint for deploying the Express server on Render. A hosted MongoDB database is required; a local MongoDB address will not work from a cloud deployment.

### Recommended first deployment

1. Create a MongoDB Atlas cluster and database user.
2. Copy the Atlas connection string, including `/tasky` as the database name.
3. Push this folder to a GitHub repository. Do not commit `.env` or `uploads/`.
4. In Render, create a **Blueprint** from that repository. Render will read `render.yaml`.
5. Set `MONGODB_URI` to the Atlas connection string.
6. Set `APP_ORIGIN` to the Render public URL, for example `https://tasky.onrender.com`.
7. Leave `ENABLE_PAYMENTS=false` until a real payment provider and webhook verification are implemented.

Render generates `JWT_SECRET` automatically from the blueprint. The health check is available at `/api/health`.

Profile pictures currently use the server filesystem. On a free web service, uploaded pictures can disappear after restarts or deployments. Use a persistent disk or object storage before relying on uploads in production.

### Production Checklist
- [ ] Set secure JWT_SECRET
- [ ] Configure MongoDB Atlas or production database
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for production domain
- [ ] Set up file upload storage (AWS S3 recommended)
- [ ] Configure SSL/HTTPS
- [ ] Set up monitoring and logging

### Environment Variables for Production
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tasky
JWT_SECRET=your-super-secure-jwt-secret-key
NODE_ENV=production
APP_ORIGIN=https://your-public-domain.example
ENABLE_PAYMENTS=false
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/profile/upload` - Upload profile picture

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `GET /api/tasks/posted` - Get user's posted tasks
- `POST /api/tasks/:id/complete` - Complete task

### Bids
- `POST /api/bids` - Create new bid
- `GET /api/bids/task/:taskId` - Get bids for task
- `GET /api/bids/my-bids` - Get user's bids
- `POST /api/bids/:bidId/accept` - Accept bid

### Payments
- `GET /api/payments` - Get payment history
- `POST /api/payments/wallet/add` - Add money to wallet

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: support@tasky.com

## 🎯 Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Rating and review system
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration (Razorpay/PayU)
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Multi-language support

---

**Built with ❤️ for the Indian freelancing community**

