# OddJobs Platform

A modern job board for finding and posting odd jobs, built with React, TypeScript, and Tailwind CSS.

## Features

- 🔍 **Smart Search** - Search jobs by name or description
- 🎯 **Advanced Filters** - Filter by location and required skills
- 💼 **Skill Matching** - Automatically highlights jobs matching your skills
- 🎨 **Professional Design** - Clean blue-themed UI with responsive layout
- ⚡ **Fast & Modern** - Built with Vite and React 18

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm, yarn, or pnpm

### Installation

1. Clone or download this project

2. Install dependencies:
```bash
npm install
```

Or if you prefer yarn:
```bash
yarn install
```

Or with pnpm:
```bash
pnpm install
```

### Running Locally

Start the development server:

```bash
npm run dev
```

Or with yarn:
```bash
yarn dev
```

Or with pnpm:
```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Project Structure

```
├── App.tsx                    # Main application component
├── main.tsx                   # Application entry point
├── components/
│   ├── JobCard.tsx           # Individual job card component
│   ├── SearchAndFilter.tsx   # Search and filter controls
│   └── ui/                   # Shadcn UI components
├── styles/
│   └── globals.css           # Global styles and Tailwind config
└── index.html                # HTML entry point
```

## Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool
- **Shadcn/UI** - UI component library
- **Lucide React** - Icons

## Customization

### Adding More Jobs

Edit the `jobs` array in `App.tsx`:

```typescript
const jobs = [
  {
    id: '1',
    name: 'Your Job Name',
    description: 'Job description here',
    budget: '$100-200',
    location: 'City, State',
    skills: ['Skill 1', 'Skill 2']
  },
  // Add more jobs...
];
```

### Updating User Skills

Edit the `userSkills` array in `App.tsx`:

```typescript
const userSkills = ['Your', 'Skills', 'Here'];
```

### Changing Colors

Modify the color scheme in `styles/globals.css` by updating the CSS variables in the `:root` section.

## License

This project is open source and available for personal and commercial use.
