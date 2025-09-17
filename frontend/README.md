# Market Research Generator - Frontend

A modern, fully functional React frontend for the Market Research Generator application with complete authentication, profile management, and dynamic analysis results.

## 🚀 Features

### Authentication & User Management
- **Complete Login/Signup System**: Modern authentication with form validation
- **Profile Management**: Edit personal information, view usage statistics
- **Subscription Management**: View plan details, billing information
- **Session Management**: Persistent login with automatic token handling

### Research Generation
- **Dynamic Report Generation**: Real-time AI-powered market research reports
- **Template System**: Pre-built templates for different analysis types
- **Advanced Options**: Customizable analysis depth and focus areas
- **Streaming Responses**: Real-time report generation with progress indicators

### Report Management
- **Comprehensive Report Viewer**: Rich markdown rendering with syntax highlighting
- **Search & Filter**: Advanced filtering by template, date, and content
- **Export Options**: Download reports in various formats
- **Report History**: Complete history of all generated reports

### Analytics Dashboard
- **Usage Statistics**: Track reports generated, remaining quota
- **Performance Metrics**: Generation times, success rates
- **Trend Analysis**: Usage patterns and insights
- **Real-time Updates**: Live data from backend API

### Modern UI/UX
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark/Light Mode**: Theme switching capability
- **Smooth Animations**: Framer Motion powered transitions
- **Accessibility**: WCAG compliant design

## 🛠️ Technology Stack

- **React 18**: Latest React with hooks and modern patterns
- **React Router 6**: Client-side routing with protected routes
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **React Query**: Server state management
- **Axios**: HTTP client with interceptors
- **React Hot Toast**: Beautiful notifications
- **React Markdown**: Markdown rendering
- **Heroicons**: Beautiful SVG icons

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd market_research_generator/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

### API Configuration
The frontend is configured to work with the FastAPI backend. Ensure the backend is running on `http://localhost:8000` or update the API URL in the configuration.

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   ├── LoadingSpinner.jsx
│   └── ...
├── context/            # React Context providers
│   ├── AuthContext.jsx # Authentication state management
│   └── ResearchContext.jsx # Research data management
├── pages/              # Page components
│   ├── Login.jsx       # Authentication pages
│   ├── Signup.jsx
│   ├── Profile.jsx     # User profile management
│   ├── Dashboard.jsx   # Main dashboard
│   ├── ResearchGenerator.jsx # Report generation
│   ├── Reports.jsx     # Report management
│   └── ...
├── services/           # API services
│   └── api.js         # Centralized API client
├── utils/              # Utility functions
└── App.js             # Main application component
```

## 🔐 Authentication Flow

1. **Login**: Users can log in with email/password or use the demo account
2. **Signup**: New users can create accounts with validation
3. **Protected Routes**: All main features require authentication
4. **Token Management**: Automatic token refresh and session handling
5. **Logout**: Secure logout with session cleanup

### Demo Account
For testing purposes, use:
- **Email**: `demo@example.com`
- **Password**: `password`

## 📊 API Integration

The frontend integrates with the FastAPI backend through a centralized API service:

### Research API
- `POST /research/generate` - Generate new reports
- `GET /research/templates` - Get available templates
- `GET /research/reports` - Get user reports
- `DELETE /research/reports/{id}` - Delete reports
- `GET /research/analytics` - Get analytics data

### User API
- `GET /research/user/profile` - Get user profile
- `PUT /research/user/profile` - Update user profile

### Authentication API
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

## 🎨 UI Components

### Core Components
- **LoadingSpinner**: Reusable loading indicator
- **Layout**: Main application layout with sidebar and header
- **Header**: Top navigation with user menu
- **Sidebar**: Navigation sidebar with menu items

### Form Components
- **Login Form**: Email/password authentication
- **Signup Form**: User registration with validation
- **Profile Form**: User profile editing
- **Research Form**: Report generation interface

### Display Components
- **Report Viewer**: Markdown report display
- **Analytics Dashboard**: Usage statistics and charts
- **Template Selector**: Template selection interface

## 🔄 State Management

### Authentication State
Managed by `AuthContext`:
- User information
- Authentication status
- Login/logout functions
- Profile management

### Research State
Managed by `ResearchContext`:
- Generated reports
- Templates
- Analytics data
- Loading states

## 🚀 Performance Optimizations

- **Code Splitting**: Lazy loading of routes
- **Memoization**: React.memo for expensive components
- **Debounced Search**: Optimized search functionality
- **Virtual Scrolling**: For large report lists
- **Image Optimization**: Optimized images and icons

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔒 Security Features

- **Protected Routes**: Authentication required for main features
- **Token Management**: Secure token storage and refresh
- **Input Validation**: Client-side form validation
- **XSS Protection**: Sanitized markdown rendering
- **CSRF Protection**: Token-based CSRF protection

## 🌟 Key Features in Detail

### 1. Dynamic Report Generation
- Real-time streaming responses from AI
- Progress indicators during generation
- Error handling with user-friendly messages
- Template-based generation with customization

### 2. Advanced Report Management
- Full-text search across reports
- Filtering by template, date, and status
- Sorting by multiple criteria
- Bulk operations (delete, export)

### 3. User Profile Management
- Complete profile editing
- Usage statistics and limits
- Subscription information
- Account settings

### 4. Analytics Dashboard
- Real-time usage metrics
- Performance analytics
- Trend analysis
- Export capabilities

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Error**
   - Ensure the FastAPI backend is running
   - Check the API URL configuration
   - Verify CORS settings

2. **Authentication Issues**
   - Clear browser storage
   - Check token expiration
   - Verify login credentials

3. **Report Generation Fails**
   - Check backend logs
   - Verify API key configuration
   - Check network connectivity

### Development Tips

1. **Hot Reload**: The development server supports hot reloading
2. **Debug Mode**: Use React Developer Tools for debugging
3. **API Testing**: Use the browser's Network tab to monitor API calls
4. **State Inspection**: Use React Context DevTools for state debugging

## 📈 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced export options (PDF, Word, Excel)
- [ ] Custom template creation
- [ ] Team management features
- [ ] Advanced analytics and reporting
- [ ] Mobile app development
- [ ] Integration with external data sources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting section

---

**Built with ❤️ using React and modern web technologies**
