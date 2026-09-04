# FI AI

### AI Investment Research Assistant

> **From market noise to investment clarity.**

FI AI is an iOS-first investment research application designed to make stock research more **personalized, organized, and actionable**.

Instead of spreading company information, market news, notes, research tools, and tasks across separate platforms, FI AI brings them into a single research environment built around the investor's workflow.

[▶ **Watch the Demo**](https://drive.google.com/file/d/1t6pCjc9P64vpKWa7eiOWUKxk7XdUDoeK/view?usp=sharing)

---

## The Idea

Investment research is highly personal.

One investor may focus on financial performance and valuation, while another prioritizes catalysts, competitors, industry trends, or breaking news. Most financial platforms, however, present investors with largely fixed research interfaces.

FI AI explores a different approach:

> **Instead of adapting your research process to the platform, the platform adapts to your research process.**

The project combines company-centered research, customizable workspaces, structured research tasks, and AI-assisted workflows in one mobile experience.

---

## Core Features

### Company-Centered Research

FI AI organizes research around individual companies rather than disconnected sources of information.

Company views provide a central place for research areas such as:

- Company information
- Financial data
- Market news
- Analysis
- Research notes
- Research tools

The goal is to reduce context switching while keeping research organized around the company being investigated.

---

### Customizable Workspace

The Workspace is a core concept behind FI AI.

Instead of giving every investor the same dashboard, FI AI allows users to create a research layout from reusable modules.

Users can:

- Add and remove research widgets
- Rearrange modules
- Save a preferred layout
- Reuse the same layout across companies

The important distinction is:

> **The layout belongs to the investor. The content belongs to the company.**

A user can move from one stock to another while maintaining the same research structure, with the content changing to match the selected company.

**Build your research process once. Use it across every company.**

---

### Research Tasks

FI AI incorporates tasks into the investment research process.

Instead of separating research objectives from the information being investigated, Tasks provide a way to organize and track research alongside the rest of the application.

This creates a workflow around:

**Question → Research → Task → Progress**

The goal is to make investment research an ongoing, structured process rather than a collection of disconnected searches and notes.

---

### AI Assistance

FI AI is designed to integrate AI into the research workflow rather than treat it only as a standalone chatbot.

AI-assisted functionality is being explored for organizing research, interpreting research objectives, and helping transform broader investment questions into structured actions.

The broader product direction is:

**Question → AI Assistance → Structured Research → Action**

AI functionality continues to evolve alongside the rest of the application.

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| **Application** | React Native, TypeScript, Expo, Expo Router |
| **Data & State** | SQLite, TanStack Query, Zustand |
| **UI & Interaction** | React Native Reanimated, React Native Gesture Handler |
| **Testing & Quality** | Jest, ESLint |
| **Development** | Git, GitHub, Codex |

---

## Architecture

FI AI is built as a **modular, local-first mobile application**.

The application separates interface concerns, asynchronously managed data, lightweight UI state, and persistent local data rather than managing everything through a single layer.

### High-Level Structure

```text
┌───────────────────────────────────────────────────────────┐
│                         FI AI                             │
│                React Native · TypeScript                  │
│                                                           │
│   ┌───────────────┐  ┌────────────────┐  ┌─────────────┐ │
│   │    Company    │  │   Workspace    │  │    Tasks    │ │
│   │    Research   │  │                │  │             │ │
│   │               │  │   Reusable     │  │  Research   │ │
│   │   Overview    │  │   research     │  │  workflows  │ │
│   │   News        │  │   modules      │  │             │ │
│   └───────────────┘  └────────────────┘  └─────────────┘ │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                Application Infrastructure                 │
│                                                           │
│     Expo Router · TanStack Query · Zustand                │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                    Local Persistence                      │
│                                                           │
│                         SQLite                            │
└───────────────────────────────────────────────────────────┘
```

This diagram represents the application's **high-level organization**, not a literal request or dependency flow.

### Navigation

**Expo Router** provides file-based navigation between application screens and company-specific views.

### Data Management

**TanStack Query** is used for asynchronous data management and caching.

This keeps asynchronously managed information separate from individual UI components and provides a foundation for integrating additional data sources as the application develops.

### UI State

**Zustand** is used for lightweight application and interface state.

It is intentionally separate from persistent storage and asynchronously managed data rather than serving as a single global store for the entire application.

### Local Persistence

**SQLite** provides on-device persistence.

The local-first approach gives FI AI a persistent data layer for application information and provides a foundation for storing user-specific research state and configuration.

---

## Workspace Design

One of FI AI's most important design decisions is separating **how a user organizes research** from **which company they are researching**.

Conceptually:

```text
                Research Layout
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
     Overview        News       Research
      Module        Module       Module
         │            │            │
         └────────────┼────────────┘
                      │
               Company Context
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
       NVDA         AAPL         MSFT
```

The first layer represents the user's preferred research structure.

The second represents the company currently being viewed.

This allows the same research organization to be reused while the information presented by each module changes with the selected company.

The model also provides a foundation for adding new research modules without requiring a completely different interface for every stock.

---

## Engineering Approach

FI AI emphasizes separation between different responsibilities within the application.

### Reusable Components

Research functionality is designed around reusable interfaces and modules rather than company-specific screens wherever possible.

### State Separation

Persistent data, asynchronous information, and temporary UI state have different requirements. FI AI uses SQLite, TanStack Query, and Zustand for different responsibilities rather than forcing them into one state-management model.

### Local-First Development

Local persistence allows the mobile application to maintain state between sessions without requiring every piece of user-specific information to depend on a remote service.

### Extensibility

The project is structured with continued expansion in mind, including additional research modules and future financial-data, news, and AI integrations.

---

## AI-Assisted Development

FI AI is also an exploration of **AI-assisted software engineering**.

I use **Codex** throughout the development process for:

- Prototyping
- Implementation
- Debugging
- Refactoring
- Testing
- Iteration

My role is to define product requirements, design the user experience, specify feature behavior, make architectural decisions, review implementations, test functionality, and iterate on the resulting product.

The development cycle generally follows:

**Idea → Specification → Implementation → Validation → Iteration**

Using an AI coding agent has made specification an important part of the engineering process. Product ideas need to be translated into explicit behavior, constraints, and acceptance criteria before they can be implemented and evaluated effectively.

The goal is not simply to generate code faster, but to explore how AI coding tools can fit into a structured software development workflow.

---

## Testing & Quality

The project uses:

- **TypeScript** for static type checking
- **Jest** for automated testing
- **ESLint** for code quality
- Expo tooling for project validation

The application also considers mobile accessibility and reduced-motion behavior as part of the interface implementation.

---

## Roadmap

FI AI is evolving toward a more complete personalized investment research environment.

Planned areas of continued development include:

- [ ] Deeper financial-data integration
- [ ] Expanded research widgets
- [ ] Additional market and news data
- [ ] More advanced AI-assisted research
- [ ] Improved task and research organization
- [ ] Expanded workspace customization
- [ ] Production-ready external data infrastructure

Items are intentionally left unchecked here unless they are complete in the current repository.

---

## About

FI AI began with a simple question:

> **What if investment software adapted to how you research?**

The project brings together my interests in **software engineering, artificial intelligence, investment research, and product design**.

Rather than building another fixed stock dashboard, FI AI explores a personalized research environment where **information, organization, AI assistance, and action can operate within the same workflow**.

---

## Author

**Po-Hsien Yu**  
University of Washington  
Computer Science & Applied Mathematics

---

### FI AI

**From market noise to investment clarity.**
