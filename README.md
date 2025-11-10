# Keten ERP

Modern, web-based ERP solution built with .NET 8 and React.

## Features

- 📦 **Product & Spare Parts Management** - Comprehensive inventory tracking
- 🔧 **Technical Service Module** - Service records, operations, and templates
- 📧 **Auto PDF & Email** - Automatic quote generation and email sending
- 👥 **Customer Management** - Complete customer relationship tracking
- 🔐 **JWT Authentication** - Secure authentication with refresh tokens

## Tech Stack

### Backend
- .NET 8 Web API
- Entity Framework Core with PostgreSQL
- ASP.NET Core Identity
- JWT Authentication
- QuestPDF for PDF generation
- MailKit for email functionality

### Frontend
- React 19
- Vite
- TailwindCSS + DaisyUI
- Axios
- React Router

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 16
- Nginx

## Quick Start

### With Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd erp
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Edit `.env` and set your passwords and secrets

4. Start the application:
```bash
docker-compose up -d
```

5. Access the application:
   - Frontend: http://localhost
   - API: http://localhost:5000
   - Swagger: http://localhost:5000/swagger

For detailed Docker instructions, see [DOCKER.md](DOCKER.md)

### Local Development

#### Prerequisites
- .NET 8 SDK
- Node.js 20+
- PostgreSQL 16

#### Backend
```bash
cd KetenErp.Api
dotnet restore
dotnet run
```

#### Frontend
```bash
cd react
npm install
npm run dev
```

## Database Migrations

The application automatically runs migrations on startup. For manual migration management:

```bash
# Create a new migration
dotnet ef migrations add MigrationName --project KetenErp.Infrastructure --startup-project KetenErp.Api

# Update database
dotnet ef database update --project KetenErp.Infrastructure --startup-project KetenErp.Api
```

## Project Status

This project is actively being developed. Currently available modules:
- ✅ Product Management
- ✅ Spare Parts Management
- ✅ Technical Service Records
- ✅ Customer Management
- 🚧 Additional modules coming soon

## Documentation

- [Docker Setup](DOCKER.md)
- [Email Configuration](EMAIL_KURULUM.md)

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.

