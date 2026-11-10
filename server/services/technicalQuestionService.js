/**
 * PrePilot AI - Production Technical Question Engine
 * High-performance, role-adaptive technical interview question bank and selector.
 * Eliminates synchronous 8-11s LLM blocking latency on interview startup,
 * delivering verified, top-tier technical questions in < 5ms while preserving
 * role customization, difficulty levels, and personalized resume context.
 */

import { sanitizeRole } from '../utils/roleSanitizer.js';

// =========================================================================
// DIFFICULTY NORMALIZER
// =========================================================================

export const normalizeDifficulty = (rawDiff = '') => {
  const d = String(rawDiff).trim().toLowerCase();
  if (['easy', 'junior', 'entry', 'beginner', '1'].includes(d)) return 'junior';
  if (['hard', 'senior', 'lead', 'staff', 'principal', '3'].includes(d)) return 'senior';
  return 'mid'; // default: 'mid' / 'medium' / 'intermediate'
};

// =========================================================================
// ROLE-SPECIFIC TECHNICAL QUESTION REPOSITORY (ALL ROLES & DIFFICULTIES)
// =========================================================================

export const ROLE_QUESTION_BANKS = {
  'Full Stack Engineer': [
    {
      category: 'System Architecture & APIs',
      difficulty: 'junior',
      questionText: 'Can you explain the difference between client-side rendering (CSR) and server-side rendering (SSR)? How does data flow from database to frontend display?',
      expectedKeyPoints: [
        'CSR renders in browser via JavaScript bundle; SSR generates initial HTML on the server.',
        'Data flow: Database -> Backend API route -> HTTP response JSON -> Frontend state -> UI render.',
        'SSR improves SEO and First Contentful Paint; CSR provides dynamic app-like navigation.'
      ],
      hints: [
        'Think about where HTML is constructed.',
        'Mention TTFB (Time to First Byte) vs client hydration.'
      ]
    },
    {
      category: 'System Architecture & APIs',
      difficulty: 'mid',
      questionText: 'Can you explain the key architectural differences between REST and GraphQL? In what production scenarios would you choose GraphQL over REST, and how do you prevent N+1 query problems in GraphQL resolvers?',
      expectedKeyPoints: [
        'REST relies on fixed endpoints and standard HTTP methods; GraphQL allows clients to specify exact data shapes via a single endpoint.',
        'GraphQL eliminates over-fetching and under-fetching, particularly beneficial for complex, data-heavy mobile and web frontends.',
        'N+1 problem in GraphQL occurs when a parent query resolves followed by N individual database queries for nested children.',
        'Solution: DataLoader pattern for batching and per-request memoization/caching of database lookups.'
      ],
      hints: [
        'Contrast network overhead and client flexibility.',
        'Mention batching tools like Dataloader or SQL JOIN strategies.'
      ]
    },
    {
      category: 'Core Runtime & Concurrency',
      difficulty: 'mid',
      questionText: 'Explain the Node.js event loop execution order, specifically how microtasks (process.nextTick, Promise callbacks) differ from macrotasks (setTimeout, setImmediate, I/O callbacks).',
      expectedKeyPoints: [
        'Event loop phases: Timers -> Pending callbacks -> Idle/Prepare -> Poll -> Check -> Close callbacks.',
        'Microtask queue executes immediately after the current operation finishes and before moving to the next event loop phase.',
        'process.nextTick queue runs with highest priority, even before standard Promise microtasks.',
        'setImmediate runs in the Check phase, whereas setTimeout runs in the Timers phase after minimum elapsed time.'
      ],
      hints: [
        'Trace an example with setTimeout vs Promise.resolve().then() vs process.nextTick().',
        'Clarify starvation risks with recursive nextTick.'
      ]
    },
    {
      category: 'Database & Concurrency',
      difficulty: 'senior',
      questionText: 'How do you design a database schema and concurrency strategy for a high-traffic inventory reservation system where multiple users can buy the last available item simultaneously?',
      expectedKeyPoints: [
        'Pessimistic vs Optimistic Locking: SELECT ... FOR UPDATE vs version/timestamp checking with conditional updates.',
        'Atomic database operations: UPDATE inventory SET stock = stock - 1 WHERE item_id = :id AND stock >= 1.',
        'Distributed locking via Redis (Redlock) or distributed messaging queues (Kafka/RabbitMQ) to serialize reservation requests.',
        'Transaction isolation levels (Serializable vs Read Committed) and handling deadlocks gracefully.'
      ],
      hints: [
        'Focus on preventing race conditions and double-spending/overselling.',
        'Discuss scalability trade-offs between database row locks and Redis-based fast decrement.'
      ]
    },
    {
      category: 'Frontend & State Synchronization',
      difficulty: 'mid',
      questionText: 'In a modern React/Next.js full-stack application, how do you handle server-side state synchronization, optimistic UI updates, and cache invalidation?',
      expectedKeyPoints: [
        'Libraries like TanStack Query (React Query) or SWR separate server caching from ephemeral local UI state.',
        'Optimistic updates update local UI immediately while initiating network mutation, rolling back on error using snapshots.',
        'Cache invalidation strategies: Query key tagging, targeted mutation side-effects, and time-to-live (staleTime/cacheTime).',
        'Handling race conditions with AbortController and request deduplication.'
      ],
      hints: [
        'Explain how to roll back UI state if a mutation fails.',
        'Discuss Server Components vs Client Components in Next.js.'
      ]
    },
    {
      category: 'Testing & Production Reliability',
      difficulty: 'junior',
      questionText: 'How do you approach unit and integration testing in a full-stack codebase? What tools do you use to test frontend components and backend endpoints?',
      expectedKeyPoints: [
        'Unit testing isolates functions/components (Jest, Vitest); integration tests verify API and database interactions (Supertest).',
        'Frontend testing focuses on user interactions and accessibility (React Testing Library).',
        'Mocking external network calls and database dependencies in unit tests.'
      ],
      hints: [
        'Name specific frameworks you have used.',
        'Contrast unit tests with end-to-end user tests.'
      ]
    },
    {
      category: 'Testing & Production Reliability',
      difficulty: 'senior',
      questionText: 'Describe your end-to-end testing and observability strategy for a full-stack microservice deployment. How do you maintain high test confidence without brittle tests?',
      expectedKeyPoints: [
        'Testing Pyramid: Fast unit tests for business logic, integration tests for API contracts and DB transactions, selective E2E tests (Playwright/Cypress) for critical user journeys.',
        'Mocking external third-party services using contract testing (Pact) or MSW (Mock Service Worker).',
        'CI/CD automation with pre-commit linters, branch protection, and automated smoke tests on staging.',
        'Observability: Structured logging (Winston/Pino), distributed tracing (OpenTelemetry), and health probe metrics (Prometheus/Grafana).'
      ],
      hints: [
        'Emphasize testing behavior and contracts rather than internal implementation details.',
        'Mention automated rollback and alerting.'
      ]
    },
    {
      category: 'Behavioral & Engineering Leadership',
      difficulty: 'mid',
      questionText: 'Describe a situation where you had to make a critical engineering trade-off between shipping a feature quickly versus reducing technical debt or refactoring an architectural bottleneck.',
      expectedKeyPoints: [
        'Structured STAR framework: Situation, Task, Action, and quantifiable Result.',
        'Demonstrates pragmatic business awareness balancing stakeholder deadlines with platform maintainability.',
        'Implemented incremental refactoring or documented debt tickets in backlog with clear risk assessments.',
        'Communicated technical risks clearly to non-technical product managers.'
      ],
      hints: [
        'Pick a concrete project from your past experience.',
        'Focus on your personal contribution and measurable outcome.'
      ]
    }
  ],

  'Frontend Engineer': [
    {
      category: 'Core JavaScript & DOM',
      difficulty: 'junior',
      questionText: 'Explain the difference between var, let, and const in JavaScript. How do closures and lexical scoping work in modern frontend development?',
      expectedKeyPoints: [
        'var is function-scoped and hoisted; let and const are block-scoped with temporal dead zones.',
        'const prevents reassignment of variable identifier, but does not deeply freeze mutable objects.',
        'Closures allow inner functions to retain access to variables from an outer enclosing lexical scope even after the outer function has executed.'
      ],
      hints: [
        'Provide an example of an event listener retaining state via closure.',
        'Explain hoisting and the temporal dead zone.'
      ]
    },
    {
      category: 'Virtual DOM & Rendering Performance',
      difficulty: 'mid',
      questionText: 'How does React Reconciliation and Fiber architecture work? What causes unnecessary re-renders in complex component trees, and how do you diagnose and eliminate them?',
      expectedKeyPoints: [
        'React Fiber enables incremental rendering, work prioritization, and interruptible rendering cycles.',
        'Reconciliation compares old and new Virtual DOM trees using heuristics (component type and keys).',
        'Unnecessary re-renders caused by unstable object/function references in props, state declared too high, or missing memoization.',
        'Optimization tools: React DevTools Profiler, React.memo, useMemo, useCallback, and lifting state down.'
      ],
      hints: [
        'Discuss why inline arrow functions or object literals can trigger child re-renders.',
        'Mention useTransition or useDeferredValue in React 18+.'
      ]
    },
    {
      category: 'Web Core Vitals & Asset Optimization',
      difficulty: 'senior',
      questionText: 'How do you optimize Core Web Vitals (LCP, INP, and CLS) for a high-traffic e-commerce or SaaS web application?',
      expectedKeyPoints: [
        'LCP (Largest Contentful Paint): Optimize hero image with priority/fetchpriority="high", preload critical fonts, minimize server response time (TTFB), CDN caching.',
        'INP (Interaction to Next Paint): Break up long JavaScript tasks (>50ms) using requestIdleCallback, Web Workers, or scheduler.yield(), minimize main thread blocking.',
        'CLS (Cumulative Layout Shift): Explicit width/height on images and media, reserve space for dynamic ads/embeds, use CSS font-display: optional or size-adjust.',
        'Code splitting: dynamic imports, tree-shaking, modern image formats (AVIF/WebP).'
      ],
      hints: [
        'Define each vital and its real-world user impact.',
        'Explain how code-splitting and bundling strategies play a role.'
      ]
    },
    {
      category: 'State Architecture & Data Flow',
      difficulty: 'mid',
      questionText: 'Compare global state management approaches in React (Context API vs Redux Toolkit vs Zustand vs Jotai). When is Context API insufficient for high-frequency state updates?',
      expectedKeyPoints: [
        'Context API triggers re-renders on all consuming components whenever the context value reference changes, even if a component only uses an unmutated property.',
        'Selector-based libraries (Zustand, Redux) allow components to subscribe to fine-grained state slices, preventing unnecessary renders.',
        'Atomic state (Jotai, Recoil) treats state as independent atoms, ideal for complex graph-like or localized state dependencies.',
        'Server cache (React Query) should be kept separate from client UI state.'
      ],
      hints: [
        'Highlight the re-render performance pitfall of React Context in high-frequency scenarios (e.g. text inputs or animations).'
      ]
    },
    {
      category: 'Browser Security & Cross-Origin Mechanics',
      difficulty: 'mid',
      questionText: 'What are the primary client-side web security threats (XSS, CSRF, Clickjacking), and what concrete frontend defenses do you implement to safeguard user sessions?',
      expectedKeyPoints: [
        'XSS (Cross-Site Scripting): Stored, Reflected, DOM-based. Defense: Content Security Policy (CSP), sanitizing user input (DOMPurify), escaping output.',
        'Session storage safety: HttpOnly, Secure, SameSite=Strict/Lax cookies prevent JavaScript credential theft via XSS.',
        'CSRF (Cross-Site Request Forgery): Prevented by SameSite cookies and Anti-CSRF tokens in mutation headers.',
        'Clickjacking defense: X-Frame-Options: DENY/SAMEORIGIN, Content Security Policy frame-ancestors directive.'
      ],
      hints: [
        'Compare localStorage vs HttpOnly cookies for storing JWT tokens.',
        'Mention dangerouslySetInnerHTML risks in React.'
      ]
    },
    {
      category: 'Testing & Accessibility (a11y)',
      difficulty: 'mid',
      questionText: 'How do you build accessible, keyboard-navigable components compliant with WCAG 2.1 AA standards, and how do you test them with React Testing Library?',
      expectedKeyPoints: [
        'Semantic HTML elements (<button>, <nav>, <main>) over generic <div> and <span> tags.',
        'WAI-ARIA roles, aria-expanded, aria-controls, and live regions when custom components are necessary.',
        'Focus management: Tab index management (roving tabindex), focus trapping in modals, and visible focus indicators.',
        'React Testing Library principles: Test user behavior and accessibility roles (getByRole, getByLabelText) rather than component internals.'
      ],
      hints: [
        'Explain how a screen reader interprets an interactive modal dialog.',
        'Avoid querying by CSS classes or test-ids unless unavoidable.'
      ]
    }
  ],

  'Backend Engineer': [
    {
      category: 'Core APIs & Protocols',
      difficulty: 'junior',
      questionText: 'Explain standard HTTP request methods (GET, POST, PUT, PATCH, DELETE) and status code ranges (2xx, 3xx, 4xx, 5xx). What makes an HTTP method idempotent?',
      expectedKeyPoints: [
        'GET/DELETE/PUT are idempotent (repeating identical requests produces same side-effect on resource state); POST is non-idempotent.',
        'PUT replaces the full resource entity; PATCH updates specific fields.',
        'Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Error.'
      ],
      hints: [
        'Define idempotency clearly.',
        'Contrast 401 Unauthorized with 403 Forbidden.'
      ]
    },
    {
      category: 'System Architecture & Microservices',
      difficulty: 'senior',
      questionText: 'How do you design a distributed microservices backend with asynchronous event-driven messaging? How do you ensure data consistency across multiple service databases?',
      expectedKeyPoints: [
        'Event-driven architecture with message brokers (Apache Kafka, RabbitMQ, or AWS SQS/SNS).',
        'Dual-write problem and Transactional Outbox Pattern to guarantee message publication without distributed 2PC.',
        'Saga Pattern (Orchestration vs Choreography) with compensating transactions for multi-service rollback.',
        'Idempotent consumers to handle at-least-once message delivery safely.'
      ],
      hints: [
        'Explain the Transactional Outbox Pattern in detail.',
        'Discuss eventual consistency and compensating actions.'
      ]
    },
    {
      category: 'Database Performance & Indexing',
      difficulty: 'senior',
      questionText: 'Explain how B-Tree database indexes work. When does an index scan become ineffective, and how do you optimize a slow SQL/NoSQL query under large dataset volumes?',
      expectedKeyPoints: [
        'B-Tree indexes provide O(log N) lookup, range scans, and sorted retrieval.',
        'Index selectivity: High-cardinality columns benefit most from indexing; low-cardinality columns (e.g. boolean flags) often cause table scans.',
        'Compound indexes and the leftmost prefix rule: Index (A, B, C) can satisfy queries on (A) and (A, B), but not (B, C) alone.',
        'Query diagnosis using EXPLAIN / EXPLAIN ANALYZE to identify sequential scans, temporary files, and unindexed joins.'
      ],
      hints: [
        'Contrast clustered vs non-clustered indexes.',
        'Explain covering indexes and index-only scans.'
      ]
    },
    {
      category: 'Caching & Distributed Systems',
      difficulty: 'mid',
      questionText: 'How do you implement a robust caching layer with Redis? How do you prevent cache penetration, cache stampede (thundering herd), and cache avalanche?',
      expectedKeyPoints: [
        'Cache patterns: Cache-Aside (Lazy Loading), Write-Through, and Write-Behind.',
        'Cache Penetration: Occurs when requests query non-existent keys repeatedly; mitigate via Bloom filters or caching null/empty values with short TTL.',
        'Cache Stampede (Thundering Herd): Occurs when a popular key expires and thousands of requests query DB simultaneously; mitigate with mutex/distributed locking or background probabilistic early refresh.',
        'Cache Avalanche: Multiple keys expire at the exact same second; mitigate by adding jitter/random offsets to expiration TTLs.'
      ],
      hints: [
        'Explain what happens to the database when a cache node restarts.',
        'Detail Redis eviction policies (LRU, LFU).'
      ]
    },
    {
      category: 'Security & API Design',
      difficulty: 'mid',
      questionText: 'How do you design and secure RESTful APIs against distributed denial of service (DDoS), API abuse, and unauthorized access? Explain rate limiting algorithms.',
      expectedKeyPoints: [
        'Rate limiting algorithms: Token Bucket, Leaky Bucket, Fixed Window Counter, and Sliding Window Log/Counter.',
        'Distributed rate limiting using Redis atomic scripts (EVAL with Lua) or sliding window sorted sets.',
        'Authentication and Authorization: Stateless JWT vs stateful session tokens, OAuth 2.0 with PKCE, and fine-grained RBAC/ABAC.',
        'Input validation and sanitization, request size limits, CORS headers, and API Gateway protection (Cloudflare, AWS WAF).'
      ],
      hints: [
        'Compare Token Bucket vs Sliding Window Counter.',
        'Explain how rate limiting headers (X-RateLimit-Remaining) inform clients.'
      ]
    },
    {
      category: 'Reliability & Fault Tolerance',
      difficulty: 'mid',
      questionText: 'What is the Circuit Breaker pattern in backend engineering? How does it prevent cascading failures across interconnected upstream and downstream microservices?',
      expectedKeyPoints: [
        'Circuit states: Closed (normal traffic), Open (requests fail immediately without calling downstream), and Half-Open (trial requests to test recovery).',
        'Failure thresholds: Error rates or timeouts exceeding configurable percentages trigger the circuit to Open.',
        'Graceful fallbacks: Return stale cached data or degraded responses while downstream service recovers.',
        'Libraries: Resilience4j, Hystrix, or custom Axios/fetch interceptor implementations.'
      ],
      hints: [
        'Describe the user experience when a dependent recommendation service goes down.',
        'Explain timeout budgets and bulkhead isolation.'
      ]
    }
  ],

  'Software Engineer': [
    {
      category: 'Data Structures & Algorithms',
      difficulty: 'junior',
      questionText: 'What are the time and space complexity differences between an Array and a Linked List for search, insertion, and deletion operations? When would you choose each?',
      expectedKeyPoints: [
        'Array: O(1) indexed access, O(N) search, O(N) insertion/deletion due to element shifting; contiguous memory improves CPU cache locality.',
        'Linked List: O(N) indexed access, O(1) insertion/deletion at known node pointer; non-contiguous memory overhead for pointers.',
        'Arrays are preferred for read-heavy operations and cache performance; linked lists for dynamic queue/deque implementations.'
      ],
      hints: [
        'Contrast memory layout and cache misses.',
        'Explain head/tail pointer advantages.'
      ]
    },
    {
      category: 'Data Structures & Algorithms',
      difficulty: 'mid',
      questionText: 'How would you find the k largest elements in a dynamic data stream of unknown length where memory is severely constrained? What is the time and space complexity?',
      expectedKeyPoints: [
        'Min-Heap (Priority Queue) of fixed size k.',
        'For each element in the stream: If heap size < k, insert element. If element > heap root, replace root with new element and heapify down.',
        'Time complexity: O(N log k) where N is stream length and k is number of elements.',
        'Space complexity: O(k) auxiliary memory, independent of stream length N.'
      ],
      hints: [
        'Avoid sorting the entire stream.',
        'Contrast Min-Heap vs Max-Heap for this scenario.'
      ]
    },
    {
      category: 'Object-Oriented Design & SOLID',
      difficulty: 'mid',
      questionText: 'Explain the SOLID design principles with concrete code design examples. Which principle is most frequently violated in legacy codebases and why?',
      expectedKeyPoints: [
        'Single Responsibility: A class should have only one reason to change.',
        'Open/Closed: Open for extension, closed for modification (using interfaces/polymorphism).',
        'Liskov Substitution: Subtypes must be substitutable for their base types without altering correctness.',
        'Interface Segregation: Clients should not be forced to depend on interfaces they do not use.',
        'Dependency Inversion: Depend on abstractions rather than concrete implementations.',
        'Single Responsibility and Open/Closed are most often violated through monolithic "God objects".'
      ],
      hints: [
        'Illustrate Dependency Inversion using dependency injection.',
        'Explain why deep inheritance hierarchies can violate Liskov Substitution.'
      ]
    },
    {
      category: 'Concurrency & Multi-Threading',
      difficulty: 'senior',
      questionText: 'What causes deadlocks in concurrent programming, what are the four necessary Coffman conditions, and how do you prevent or recover from deadlocks?',
      expectedKeyPoints: [
        'Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
        'Deadlock prevention: Eliminate Circular Wait by enforcing a strict global lock acquisition order across all threads.',
        'Timeouts: Try-lock mechanisms with exponential backoff rather than infinite blocking.',
        'Deadlock detection: Wait-for graphs and cycle detection algorithms.'
      ],
      hints: [
        'Discuss real-world scenarios in database transactions or worker threads.',
        'Explain optimistic lock-free data structures (Compare-And-Swap / CAS).'
      ]
    },
    {
      category: 'Clean Code & Refactoring',
      difficulty: 'mid',
      questionText: 'When reviewing a pull request with high cognitive complexity and deeply nested conditionals, what refactoring patterns do you apply to improve readability and maintainability?',
      expectedKeyPoints: [
        'Guard clauses and early returns to flatten nested if/else pyramids.',
        'Extract Method / Function to encapsulate discrete business logic with descriptive naming.',
        'Replace conditional logic with Polymorphism or Strategy Pattern for divergent behaviors.',
        'Replace magic numbers and strings with domain constants or enums.',
        'Ensure unit test coverage exists before refactoring to prevent regressions.'
      ],
      hints: [
        'Walk through before/after refactoring of a nested validation function.',
        'Mention the Boy Scout rule in code reviews.'
      ]
    },
    {
      category: 'Behavioral & Collaborative Problem Solving',
      difficulty: 'mid',
      questionText: 'Tell me about a time you discovered a critical bug in production right before or after a major release. How did you triage, resolve, and prevent it in the future?',
      expectedKeyPoints: [
        'Structured STAR framework: Situation, Task, Action, Result.',
        'Calm triage: Rolled back release or enabled feature flag kill-switch to protect end users immediately.',
        'Root cause analysis (RCA): Blameless post-mortem identifying systemic gaps rather than individual fault.',
        'Preventative action: Added automated integration regression tests and health alerts.'
      ],
      hints: [
        'Focus on communication with team members and stakeholder management under pressure.'
      ]
    }
  ],

  'DevOps & Cloud Engineer': [
    {
      category: 'Containerization & Orchestration',
      difficulty: 'junior',
      questionText: 'What is the difference between a Docker image and a Docker container? How do multi-stage Docker builds reduce image size and improve security?',
      expectedKeyPoints: [
        'An image is a read-only immutable template with layers; a container is a running instance of an image with a writable layer.',
        'Multi-stage builds compile artifacts in a builder stage and copy only the final binary/bundle into a minimal runtime base (e.g. Alpine/Distroless).',
        'Reduces attack surface by eliminating compiler toolchains, package managers, and source code from production images.'
      ],
      hints: [
        'Explain image layer caching.',
        'Mention Distroless or Alpine bases.'
      ]
    },
    {
      category: 'Containerization & Orchestration',
      difficulty: 'senior',
      questionText: 'How do Kubernetes Pod scheduling, Services, and Ingress controllers interact to route incoming user traffic to containerized applications? How does kube-proxy function?',
      expectedKeyPoints: [
        'Ingress Controller (NGINX/Traefik) routes external HTTP/S traffic based on host and path rules to Kubernetes Services.',
        'Service provides a stable virtual IP (ClusterIP) and DNS name, abstracting dynamic Pod IP addresses.',
        'kube-proxy maintains network rules (iptables or IPVS) on each node to forward traffic to backend Pod endpoints.',
        'Liveness and Readiness probes determine when Pods should receive traffic.'
      ],
      hints: [
        'Trace a packet from external client to specific Pod container.',
        'Contrast ClusterIP vs NodePort vs LoadBalancer service types.'
      ]
    },
    {
      category: 'Infrastructure as Code (IaC)',
      difficulty: 'mid',
      questionText: 'Explain the Terraform state lifecycle and state locking. How do you manage team collaboration with remote state, and what is your strategy for drift detection?',
      expectedKeyPoints: [
        'Terraform state maps configuration resources to real-world infrastructure objects and tracks metadata.',
        'Remote state backends (AWS S3 + DynamoDB for locking) prevent concurrent apply operations and state corruption.',
        'State drift occurs when out-of-band changes happen directly in cloud consoles; detected via terraform plan / refresh.',
        'Terraform modules promote reusability and DRY infrastructure across staging and production environments.'
      ],
      hints: [
        'Explain why storing terraform.tfstate in Git is dangerous.',
        'Mention handling secrets in Terraform without committing them.'
      ]
    },
    {
      category: 'CI/CD & Deployment Strategies',
      difficulty: 'mid',
      questionText: 'Compare Blue-Green, Canary, and Rolling deployment strategies. What are the advantages, trade-offs, and rollback mechanisms for each under zero-downtime requirements?',
      expectedKeyPoints: [
        'Rolling: Incremental replacement of old instances with new ones; resource-efficient but runs mixed versions simultaneously.',
        'Blue-Green: Two identical environments; switch router traffic all at once; instant rollback but requires double infrastructure capacity.',
        'Canary: Deploy new version to a tiny percentage of users (e.g. 5%), analyze metrics/error rates, then roll out to 100%.',
        'Database migration backward compatibility is critical across all zero-downtime deployments (expand/contract pattern).'
      ],
      hints: [
        'Discuss how to handle schema changes when old and new code versions run concurrently.'
      ]
    },
    {
      category: 'Cloud Security & Networking',
      difficulty: 'mid',
      questionText: 'How do you design a secure Virtual Private Cloud (VPC) network architecture for a multi-tier web application adhering to the Principle of Least Privilege?',
      expectedKeyPoints: [
        'Public subnets for internet-facing load balancers with Internet Gateway.',
        'Private subnets for application servers and microservices, routing outbound traffic through NAT Gateways.',
        'Isolated database subnets with no internet access (inbound or outbound).',
        'Security Groups (stateful) and Network ACLs (stateless) to restrict traffic strictly by required ports and CIDRs.',
        'IAM roles with granular permissions rather than hardcoded access keys.'
      ],
      hints: [
        'Explain why database servers should never reside in public subnets.',
        'Discuss bastion hosts or AWS Systems Manager Session Manager for administrative access.'
      ]
    },
    {
      category: 'Observability & SRE',
      difficulty: 'senior',
      questionText: 'What are the Four Golden Signals of SRE monitoring (Latency, Traffic, Errors, Saturation)? How do you define SLIs, SLOs, and Error Budgets to balance reliability with velocity?',
      expectedKeyPoints: [
        'Four Golden Signals: Latency (time to service request), Traffic (demand/RPS), Errors (rate of failed requests), Saturation (resource utilization fraction).',
        'SLI (Service Level Indicator): Quantifiable metric, e.g. % of HTTP requests returning < 200ms.',
        'SLO (Service Level Objective): Target goal agreed with business, e.g. 99.9% of requests meet SLI over 30 days.',
        'Error Budget: 100% - SLO (0.1%); if exhausted, halt risky feature deployments and prioritize platform stabilization.'
      ],
      hints: [
        'Explain the difference between SLO and SLA.',
        'Discuss synthetic monitoring vs real user monitoring (RUM).'
      ]
    }
  ],

  'Data Analyst': [
    {
      category: 'SQL & Data Warehousing',
      difficulty: 'junior',
      questionText: 'What is the difference between WHERE and HAVING in SQL? Explain how GROUP BY aggregations work with real-world examples.',
      expectedKeyPoints: [
        'WHERE filters individual rows before any aggregations are computed; HAVING filters aggregated groups after GROUP BY.',
        'Aggregate functions (COUNT, SUM, AVG, MAX, MIN) cannot be used in WHERE clauses.',
        'Execution order: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY.'
      ],
      hints: [
        'Write a sample query finding departments with average salary > $80,000.',
        'Highlight query execution order.'
      ]
    },
    {
      category: 'SQL & Window Functions',
      difficulty: 'mid',
      questionText: 'How do SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD) differ from aggregate functions? How do you compute a running total and month-over-month growth?',
      expectedKeyPoints: [
        'Window functions perform calculations across a partition of rows while retaining individual row identities without collapsing rows.',
        'DENSE_RANK handles ties without gaps in rank numbers, whereas RANK introduces gaps.',
        'Running total: SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW).',
        'Month-over-month: (current_rev - LAG(current_rev) OVER (ORDER BY month)) / LAG(current_rev) * 100.'
      ],
      hints: [
        'Contrast PARTITION BY with GROUP BY.',
        'Explain frame specifications (ROWS vs RANGE).'
      ]
    },
    {
      category: 'Data Modeling & Dimensional Design',
      difficulty: 'senior',
      questionText: 'Compare Star Schema and Snowflake Schema in Kimball dimensional data modeling. How do Slowly Changing Dimensions (SCD Type 1, Type 2, Type 3) preserve historical records in a data warehouse?',
      expectedKeyPoints: [
        'Star schema denormalizes dimension tables directly linked to central fact tables; faster queries due to fewer joins.',
        'Snowflake schema normalizes dimensions into sub-dimensions; reduces data redundancy but increases join complexity.',
        'SCD Type 1 overwrites old value (no history); SCD Type 2 adds new row with effective dates (is_current, valid_from, valid_to); SCD Type 3 adds previous_value column.'
      ],
      hints: [
        'Explain fact tables vs dimension tables.',
        'Walk through a customer address change scenario in SCD Type 2.'
      ]
    },
    {
      category: 'Data Analysis & Python (Pandas)',
      difficulty: 'mid',
      questionText: 'In Python Pandas, how do you handle missing values, detect and treat outliers, and merge large datasets efficiently without memory exhaustion?',
      expectedKeyPoints: [
        'Missing data strategies: Imputation (mean, median, mode, forward-fill) vs deletion depending on missingness mechanism (MCAR, MAR, MNAR).',
        'Outlier detection: IQR (Interquartile Range) method (Q1 - 1.5*IQR to Q3 + 1.5*IQR) and Z-score thresholding.',
        'Memory optimization: Downcasting numeric data types (float64 -> float32, int64 -> int16), categorical data types for repeated strings, and chunking (pd.read_csv with chunksize).'
      ],
      hints: [
        'Discuss memory profiling with df.info(memory_usage="deep").'
      ]
    },
    {
      category: 'Business Metrics & A/B Testing',
      difficulty: 'mid',
      questionText: 'How do you design an A/B experimentation test for a product feature? How do you calculate required sample size, avoid p-hacking, and interpret statistical significance (p-value, confidence intervals)?',
      expectedKeyPoints: [
        'Formulate null hypothesis (H0) and alternative hypothesis (H1) with primary success metric.',
        'Sample size determined by baseline conversion rate, minimum detectable effect (MDE), significance level (alpha = 0.05), and statistical power (1 - beta = 0.8).',
        'Avoiding peeking and p-hacking by fixing sample size upfront or utilizing sequential testing (SPRT).',
        'Distinguishing statistical significance from practical/business significance.'
      ],
      hints: [
        'Explain Type I error (false positive) vs Type II error (false negative).'
      ]
    }
  ],

  'QA Engineer': [
    {
      category: 'Test Strategies & Methodologies',
      difficulty: 'junior',
      questionText: 'What is the difference between Functional Testing and Non-Functional Testing? Explain Smoke Testing vs Sanity Testing vs Regression Testing.',
      expectedKeyPoints: [
        'Functional verifies software behavior against specifications (what the system does); Non-Functional evaluates performance, scalability, usability, and security (how the system behaves).',
        'Smoke testing verifies critical build stability before deeper QA; Sanity testing verifies specific bug fixes or minor enhancements.',
        'Regression testing ensures recent code updates do not break existing verified functionality.'
      ],
      hints: [
        'Provide practical scenarios for when each test type is run in a CI pipeline.'
      ]
    },
    {
      category: 'Test Automation Architecture',
      difficulty: 'mid',
      questionText: 'How do you design a maintainable test automation framework using the Page Object Model (POM) pattern in Cypress, Playwright, or Selenium?',
      expectedKeyPoints: [
        'Page Object Model separates page UI elements and user interactions into dedicated classes/modules away from test assertions.',
        'Reduces test maintenance: If an element locator changes, it is updated in a single Page Object file rather than across dozens of test specs.',
        'Explicit dynamic waits (waitForSelector, auto-waiting in Playwright) over flaky hardcoded sleeps (Thread.sleep).',
        'Data-driven testing: Externalizing test input data into JSON/CSV files.'
      ],
      hints: [
        'Explain why hardcoded sleeps cause flaky CI test runs.',
        'Contrast Selenium vs modern Playwright architecture.'
      ]
    },
    {
      category: 'API Testing & Contract Testing',
      difficulty: 'mid',
      questionText: 'How do you automate API integration testing using tools like Postman, REST Assured, or Supertest? What status codes, payload validations, and edge cases do you prioritize?',
      expectedKeyPoints: [
        'Validating HTTP status codes, response headers, latency SLAs, and JSON schema validation against OpenAPI/Swagger specs.',
        'Testing positive paths, negative paths (missing required fields, malformed types), boundary values, and authentication/authorization boundaries.',
        'Chaining API requests: Extracting auth tokens or entity IDs from prior responses to feed downstream calls.'
      ],
      hints: [
        'Explain JSON schema validation.',
        'Discuss testing authentication tokens and rate limits.'
      ]
    },
    {
      category: 'Performance & Load Testing',
      difficulty: 'senior',
      questionText: 'How do you plan, design, and execute load, stress, and endurance testing using JMeter or k6? What performance bottlenecks (thread pool, DB connection leak, GC pauses) do you watch for?',
      expectedKeyPoints: [
        'Defining test profiles: Load test (expected normal peak), Stress test (breakpoint limit), Soak/Endurance test (memory leaks over 24h).',
        'Metrics: Throughput (RPS), Error rate (<1%), Response times at p95 and p99 percentiles rather than misleading averages.',
        'Diagnosing bottlenecks: Database connection pool exhaustion, memory heap leaks, long Garbage Collection pauses, and CPU saturation.'
      ],
      hints: [
        'Explain why median/mean latency hides tail latency spikes.',
        'Describe steps when response times degrade non-linearly.'
      ]
    },
    {
      category: 'Defect Triage & Quality Advocacy',
      difficulty: 'mid',
      questionText: 'What makes a high-quality defect report? When a developer claims "it works on my machine", how do you systematically triage and reproduce the issue?',
      expectedKeyPoints: [
        'Defect anatomy: Clear summary, environment details, exact preconditions, step-by-step reproduction steps, expected vs actual behavior, logs, screenshots, and network HAR files.',
        'Isolating environment variables: Browser version, operating system, cache state, network throttling, and user permissions.',
        'Professional collaboration: Pairing with developer to reproduce issue in Docker container or staging environment.'
      ],
      hints: [
        'Focus on structured evidence and blameless communication.'
      ]
    }
  ],

  'Cybersecurity Analyst': [
    {
      category: 'Web Application Security & OWASP',
      difficulty: 'junior',
      questionText: 'Explain SQL Injection (SQLi) and Cross-Site Scripting (XSS). How does an attacker exploit them, and what are the primary code-level defenses?',
      expectedKeyPoints: [
        'SQLi occurs when untrusted input is concatenated into database queries; mitigated via parameterized queries (Prepared Statements) and ORMs.',
        'XSS injects malicious scripts executed in user browser; mitigated by context-aware output encoding, Content Security Policy (CSP), and HttpOnly cookies.',
        'Defense in depth: Input validation at API gateway, least privilege database accounts.'
      ],
      hints: [
        'Show what a malicious SQL payload looks like (e.g. 1=1).',
        'Explain why parameterized queries prevent SQL injection.'
      ]
    },
    {
      category: 'Authentication & Cryptography',
      difficulty: 'mid',
      questionText: 'How do hashing, symmetric encryption (AES), and asymmetric encryption (RSA/ECC) differ? How should passwords and JWT tokens be securely generated, salted, and verified?',
      expectedKeyPoints: [
        'Hashing is one-way deterministic computation (bcrypt, Argon2, PBKDF2); encryption is two-way reversible with keys.',
        'Passwords must be salted with unique cryptographically secure random bytes and hashed using slow, memory-hard algorithms (Argon2id/bcrypt) with high work factors.',
        'JWT tokens: Signed with strong secrets (HS256) or private keys (RS256); access tokens kept short-lived (15m) with refresh token rotation.',
        'Asymmetric encryption secures key exchange (TLS handshake); symmetric encryption secures high-speed bulk data transfer.'
      ],
      hints: [
        'Explain why MD5 and SHA-1 are cryptographically broken.',
        'Discuss why salting prevents rainbow table attacks.'
      ]
    },
    {
      category: 'Threat Modeling & Vulnerability Management',
      difficulty: 'senior',
      questionText: 'Explain the STRIDE threat modeling framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) and CVSS scoring in enterprise security.',
      expectedKeyPoints: [
        'STRIDE categories identify specific threats during architectural design before code is written.',
        'Spoofing -> Authentication; Tampering -> Integrity/Signatures; Repudiation -> Non-repudiation/Audit logs; Info Disclosure -> Encryption/Confidentiality; DoS -> Availability/Rate limits; Elevation -> Authorization/RBAC.',
        'CVSS (Common Vulnerability Scoring System): Evaluates Base, Temporal, and Environmental metrics producing a 0-10 severity score.',
        'Prioritizing remediation based on exploitability in the wild and asset criticality.'
      ],
      hints: [
        'Map each letter of STRIDE to its corresponding security control.',
        'Explain attack vector and privileges required in CVSS.'
      ]
    },
    {
      category: 'Incident Response & SOC Operations',
      difficulty: 'mid',
      questionText: 'Walk through the NIST Incident Response lifecycle (Preparation, Detection & Analysis, Containment, Eradication & Recovery, Post-Incident Activity). How do you handle a suspected ransomware infection?',
      expectedKeyPoints: [
        'Immediate containment: Isolate infected endpoint from network (disconnect Ethernet/Wi-Fi, disable switch port) to stop lateral movement.',
        'Preserve forensic evidence: Capture volatile memory (RAM dump) before rebooting; preserve disk images and network PCAP files.',
        'Identification: Analyze C2 (command & control) IP connections, hashes, and persistence mechanisms.',
        'Eradication & Recovery: Rebuild machines from clean Golden Images; restore verified offline/immutable backups.',
        'Post-Incident: Blameless lessons learned and update EDR/SIEM detection rules.'
      ],
      hints: [
        'Explain why powering off a machine destroys critical volatile RAM evidence.',
        'Discuss immutable offline backups.'
      ]
    },
    {
      category: 'Cloud Security & IAM',
      difficulty: 'mid',
      questionText: 'What is the Principle of Least Privilege in cloud environments (AWS/Azure/GCP)? How do you prevent credential leakage, privilege escalation, and lateral movement in IAM?',
      expectedKeyPoints: [
        'Grant only minimum necessary permissions required to perform task; avoid wildcard policies (Action: *).',
        'Use short-lived IAM roles with STS temporary credentials rather than permanent IAM user access keys.',
        'Implement Service Control Policies (SCPs) and Permission Boundaries to set hard ceilings.',
        'Enable MFA, audit inactive keys, and enforce automated secret rotation using AWS Secrets Manager or HashiCorp Vault.'
      ],
      hints: [
        'Explain the danger of hardcoded AWS_ACCESS_KEY_ID in public GitHub repos.',
        'Discuss IAM Permission Boundaries.'
      ]
    }
  ],

  'Mobile Engineer': [
    {
      category: 'Mobile Architecture & Lifecycle',
      difficulty: 'junior',
      questionText: 'Explain the application and screen lifecycle in mobile development (React Native, iOS, or Android). How do you handle backgrounding, memory warnings, and orientation changes?',
      expectedKeyPoints: [
        'Lifecycle states: Active/Foreground, Inactive, Background, Suspended/Terminated.',
        'Handling memory warnings: Purge in-memory image caches and release heavy non-essential objects.',
        'Persisting user draft state when transitioning to background to prevent data loss on OS process kill.',
        'Handling screen orientation changes without restarting activities or losing user form state.'
      ],
      hints: [
        'Contrast iOS UIViewController lifecycle with Android Activity/Fragment lifecycle.'
      ]
    },
    {
      category: 'Offline-First & Local Storage',
      difficulty: 'mid',
      questionText: 'How do you design an offline-first mobile application architecture with bidirectional data synchronization and conflict resolution when connectivity restores?',
      expectedKeyPoints: [
        'Local embedded database (SQLite, Realm, WatermelonDB) serves as single source of truth for the UI.',
        'Mutation queue: Offline actions appended to persistent local queue; sync engine processes queue with exponential backoff on reconnection.',
        'Conflict resolution strategies: Last-Write-Wins (timestamp), Client-wins, Server-wins, or CRDTs (Conflict-free Replicated Data Types).',
        'Network reachability listeners (NetInfo) to pause/resume background sync jobs.'
      ],
      hints: [
        'Explain why relying on network calls before rendering causes poor mobile UX.',
        'Discuss handling UUIDs generated offline.'
      ]
    },
    {
      category: 'Mobile Performance & Memory Management',
      difficulty: 'senior',
      questionText: 'How do you profile and optimize 60/120 FPS UI smoothness, memory leaks, battery consumption, and app launch times (Cold vs Warm start) on mobile devices?',
      expectedKeyPoints: [
        'App launch: Cold start (process creation + app initialization), Warm start (activity recreation), Hot start (bringing to foreground). Optimize by lazy-loading SDKs.',
        'UI smoothness: Maintain 16.6ms frame budget; avoid blocking the main UI thread with heavy calculations or synchronous JSON parsing (use background workers/isolates).',
        'Virtualized lists (FlatList, RecyclerView) to reuse component cells rather than mounting thousands of list items.',
        'Memory leaks: Retained view references in listeners, uncancelled network subscriptions, and uncompressed image bitmaps.'
      ],
      hints: [
        'Explain cell recycling in list rendering.',
        'Discuss image caching libraries (FastImage, Glide).'
      ]
    },
    {
      category: 'Mobile Security & Data Protection',
      difficulty: 'mid',
      questionText: 'How do you secure mobile application data at rest and in transit? How do you implement SSL/TLS Certificate Pinning and secure hardware keystore storage?',
      expectedKeyPoints: [
        'Data at rest: Store sensitive credentials (auth tokens, encryption keys) exclusively in iOS Keychain or Android Keystore / EncryptedSharedPreferences (never AsyncStorage or plain files).',
        'Data in transit: HTTPS with TLS 1.3, SSL Certificate Pinning to prevent Man-In-The-Middle (MITM) proxy inspection.',
        'App integrity: Root/Jailbreak detection, code obfuscation (ProGuard/R8), and biometric authentication (FaceID/Fingerprint).',
        'Preventing sensitive data caching in app switcher screenshots.'
      ],
      hints: [
        'Explain the risk of inspecting app traffic with Charles Proxy or Burp Suite.',
        'Contrast Keychain vs SharedPreferences.'
      ]
    },
    {
      category: 'Native Bridges & Cross-Platform Mechanics',
      difficulty: 'mid',
      questionText: 'In cross-platform mobile frameworks like React Native or Flutter, how does code communicate with underlying native iOS/Android platform APIs? Explain the React Native New Architecture (JSI, Fabric, TurboModules).',
      expectedKeyPoints: [
        'Legacy React Native Bridge used asynchronous JSON serialization over a single thread, causing serialization bottlenecks for high-frequency events (gestures, animations).',
        'New Architecture JSI (JavaScript Interface): Allows JavaScript to hold direct C++ host object references to native methods without JSON serialization.',
        'Fabric: New concurrent rendering system supporting synchronous layout and thread-safe UI updates.',
        'TurboModules: Lazy-loads native modules on demand rather than loading all modules upfront at app launch.'
      ],
      hints: [
        'Explain why JSON serialization across the legacy bridge was a bottleneck for scroll animations.'
      ]
    }
  ]
};

// Default fallback question pool for general/unspecified roles
export const DEFAULT_TECHNICAL_QUESTIONS = [
  {
    category: 'System Architecture & Scalability',
    difficulty: 'mid',
    questionText: 'How do you design a scalable web application backend capable of handling sudden 10x traffic spikes? What architectural tiers and bottlenecks do you prioritize?',
    expectedKeyPoints: [
      'Stateless application servers horizontally scaled behind load balancers.',
      'Caching hot read paths with Redis or Memcached and using CDNs for static media.',
      'Database read replicas, connection pooling, and asynchronous job queues for write-heavy tasks.',
      'Rate limiting, autoscaling policies, and circuit breakers to avoid cascading crashes.'
    ],
    hints: [
      'Focus on decoupling synchronous operations into asynchronous worker queues.',
      'Discuss horizontal vs vertical scaling limits.'
    ]
  },
  {
    category: 'Database & Data Integrity',
    difficulty: 'mid',
    questionText: 'Explain the trade-offs between relational SQL databases (ACID compliance) and NoSQL databases (BASE model / eventual consistency). When would you choose each?',
    expectedKeyPoints: [
      'SQL: Strong schema, ACID guarantees, relational joins; ideal for financial, transactional, and strict structured records.',
      'NoSQL: Flexible schema, horizontal partitioning/sharding, eventual consistency; ideal for high-write telemetry, social feeds, and unstructured documents.',
      'CAP Theorem: Consistency, Availability, and Partition Tolerance trade-offs under network partitions.'
    ],
    hints: [
      'Provide real-world application examples for both SQL and NoSQL.',
      'Mention query patterns and access models.'
    ]
  },
  {
    category: 'Application Performance & Asynchronous I/O',
    difficulty: 'mid',
    questionText: 'How do asynchronous operations, non-blocking I/O, and event-driven architectures prevent thread starvation compared to traditional multi-threaded thread-per-request models?',
    expectedKeyPoints: [
      'Single-threaded event loop handles thousands of concurrent socket connections by delegating I/O to the operating system kernel (epoll/kqueue).',
      'Thread-per-request models consume high memory (stack per thread) and spend CPU time on context switching under high concurrency.',
      'Worker pools or thread pools handle CPU-bound calculations without blocking the main event loop.'
    ],
    hints: [
      'Contrast memory overhead of 10,000 idle threads vs 10,000 asynchronous socket handles.'
    ]
  },
  {
    category: 'Testing Strategy & Quality Assurance',
    difficulty: 'mid',
    questionText: 'What is your testing philosophy across unit, integration, and end-to-end tests? How do you ensure high test coverage without causing high maintenance friction?',
    expectedKeyPoints: [
      'Test behaviors and business requirements rather than fragile internal implementation details.',
      'Fast unit tests for complex domain logic, integration tests for API endpoints and database boundaries.',
      'Mocking slow external third-party services while testing local database queries against real test containers.',
      'Automated CI pipeline gating code changes with linting, unit tests, and security scans.'
    ],
    hints: [
      'Discuss test maintenance costs and avoiding brittle snapshot tests.'
    ]
  },
  {
    category: 'Engineering Trade-offs & Behavioral (STAR)',
    difficulty: 'mid',
    questionText: 'Describe a challenging technical problem you solved where you had to debug an elusive production issue with incomplete information. What was your systematic methodology?',
    expectedKeyPoints: [
      'STAR framework: Situation, Task, Action, and measurable Result.',
      'Systematic debugging: Inspected logs, reproduced issue in isolated environment, analyzed metrics, and formed verifiable hypotheses.',
      'Implemented clean fix with automated regression test and post-mortem review.'
    ],
    hints: [
      'Focus on analytical troubleshooting rather than random trial-and-error.'
    ]
  }
];

// In-memory cache for ultra-fast question retrieval by role/parameters
export const questionCache = new Map();

/**
 * Deep clones an array or object to guarantee strict immutability between cache and sessions
 */
export const deepCloneQuestions = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item) => ({
    questionNumber: item.questionNumber,
    questionText: item.questionText,
    category: item.category,
    expectedKeyPoints: Array.isArray(item.expectedKeyPoints) ? [...item.expectedKeyPoints] : [],
    hints: Array.isArray(item.hints) ? [...item.hints] : [],
  }));
};

/**
 * Normalizes input role string to match known question bank roles
 */
export const matchRoleKey = (rawRole = '') => {
  const sanitized = sanitizeRole(rawRole).toLowerCase();

  if (sanitized.includes('front') || sanitized.includes('ui') || sanitized.includes('react') || sanitized.includes('angular') || sanitized.includes('vue')) {
    return 'Frontend Engineer';
  }
  if (sanitized.includes('back') || sanitized.includes('node') || sanitized.includes('django') || sanitized.includes('spring') || sanitized.includes('api')) {
    return 'Backend Engineer';
  }
  if (sanitized.includes('devops') || sanitized.includes('cloud') || sanitized.includes('sre') || sanitized.includes('infrastructure') || sanitized.includes('kubernetes')) {
    return 'DevOps & Cloud Engineer';
  }
  if (sanitized.includes('data') || sanitized.includes('analytics') || sanitized.includes('bi ') || sanitized.includes('tableau') || sanitized.includes('sql')) {
    return 'Data Analyst';
  }
  if (sanitized.includes('qa') || sanitized.includes('test') || sanitized.includes('quality') || sanitized.includes('sdet')) {
    return 'QA Engineer';
  }
  if (sanitized.includes('sec') || sanitized.includes('cyber') || sanitized.includes('soc') || sanitized.includes('penetration')) {
    return 'Cybersecurity Analyst';
  }
  if (sanitized.includes('mobile') || sanitized.includes('ios') || sanitized.includes('android') || sanitized.includes('react native') || sanitized.includes('flutter')) {
    return 'Mobile Engineer';
  }
  if (sanitized.includes('full') || sanitized.includes('mern') || sanitized.includes('mean') || sanitized.includes('web')) {
    return 'Full Stack Engineer';
  }
  if (sanitized.includes('software') || sanitized.includes('developer') || sanitized.includes('engineer')) {
    return 'Software Engineer';
  }

  return 'Full Stack Engineer';
};

/**
 * Fast, non-blocking technical question generator/selector.
 * Returns exactly `count` balanced, high-quality technical interview questions.
 */
export const selectTechnicalQuestions = ({
  targetRole = 'Full Stack Engineer',
  interviewType = 'technical',
  difficulty = 'mid',
  count = 5,
  focusTopic = null,
  parsedResume = null,
}) => {
  const cleanRole = sanitizeRole(targetRole);
  const matchedKey = matchRoleKey(cleanRole);
  const normalizedDiff = normalizeDifficulty(difficulty);
  const normalizedTopic = focusTopic && typeof focusTopic === 'string' && focusTopic.trim()
    ? focusTopic.trim().toLowerCase()
    : 'general';

  const cacheKey = `${matchedKey}:${normalizedDiff}:${count}:${normalizedTopic}`;

  // Check TTL cache (only when no personalized resume context is provided)
  if (questionCache.has(cacheKey) && !parsedResume) {
    const cached = questionCache.get(cacheKey);
    // Deep clone to guarantee complete cache immutability across sessions
    return deepCloneQuestions(cached).map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
  }

  // 1. Fetch source pool
  const rolePool = ROLE_QUESTION_BANKS[matchedKey] || DEFAULT_TECHNICAL_QUESTIONS;
  let candidatePool = [...rolePool];

  // 2. Filter or score by difficulty match
  const difficultyMatched = candidatePool.filter(
    (q) => normalizeDifficulty(q.difficulty) === normalizedDiff
  );
  if (difficultyMatched.length >= count) {
    candidatePool = difficultyMatched;
  } else if (difficultyMatched.length > 0) {
    const others = candidatePool.filter((q) => !difficultyMatched.includes(q));
    candidatePool = [...difficultyMatched, ...others];
  }

  // If pool has fewer questions than requested, combine with default questions
  if (candidatePool.length < count) {
    const defaultExtras = DEFAULT_TECHNICAL_QUESTIONS.filter(
      (dq) => !candidatePool.some((cq) => cq.questionText === dq.questionText)
    );
    candidatePool = candidatePool.concat(defaultExtras);
  }

  // 3. Filter or prioritize by focusTopic if provided
  if (normalizedTopic !== 'general') {
    const topicMatches = candidatePool.filter((q) =>
      q.questionText.toLowerCase().includes(normalizedTopic) ||
      q.category.toLowerCase().includes(normalizedTopic) ||
      (q.expectedKeyPoints || []).some((kp) => kp.toLowerCase().includes(normalizedTopic))
    );

    if (topicMatches.length > 0) {
      const nonMatches = candidatePool.filter((q) => !topicMatches.includes(q));
      candidatePool = [...topicMatches, ...nonMatches];
    } else {
      // Synthesize a specialized focus question at index 0
      const capitalizedTopic = focusTopic.trim();
      const synthesizedFocusQuestion = {
        category: `Specialized Focus: ${capitalizedTopic}`,
        difficulty: normalizedDiff,
        questionText: `In your engineering practice with ${capitalizedTopic}, describe an architectural or implementation challenge you resolved. How did you structure your solution and what performance or maintainability trade-offs did you evaluate?`,
        expectedKeyPoints: [
          `Clear problem statement and technical motivation for using ${capitalizedTopic}.`,
          `Concrete technical mechanisms, architecture patterns, and tools utilized.`,
          `Quantifiable outcomes, error handling, and lessons learned.`
        ],
        hints: [
          `Use the STAR method: Situation, Task, Action, and Result.`,
          `Discuss trade-offs and alternative approaches you considered.`
        ]
      };
      candidatePool.unshift(synthesizedFocusQuestion);
    }
  }

  // 4. Select questions with category diversity and duplicate prevention
  const selected = [];
  const usedTexts = new Set();
  const usedCategories = new Set();

  // Pass 1: Pick one question from each unique category first
  for (const q of candidatePool) {
    if (!usedTexts.has(q.questionText) && !usedCategories.has(q.category) && selected.length < count) {
      selected.push(q);
      usedTexts.add(q.questionText);
      usedCategories.add(q.category);
    }
  }

  // Pass 2: Fill remaining slots with distinct question texts
  if (selected.length < count) {
    for (const q of candidatePool) {
      if (!usedTexts.has(q.questionText) && selected.length < count) {
        selected.push(q);
        usedTexts.add(q.questionText);
      }
    }
  }

  // 5. Personalize with resume context if available
  const finalQuestions = selected.slice(0, count).map((q, idx) => {
    let questionText = q.questionText;

    // Adapt to target role name if appropriate
    if (questionText.includes('Full Stack') && cleanRole !== 'Full Stack Engineer') {
      questionText = questionText.replace(/Full Stack/g, cleanRole);
    }

    // Adapt to resume projects or skills if present
    if (parsedResume) {
      const projects = Array.isArray(parsedResume.projects) ? parsedResume.projects : [];
      if (projects.length > 0 && idx === 1) {
        const topProj = projects[0];
        if (topProj && topProj.name) {
          questionText = `In your project "${topProj.name}" (${topProj.techStack ? topProj.techStack.join(', ') : 'software stack'}), how did you structure the core architecture, handle data flow, and tackle the most challenging technical roadblock?`;
        }
      } else if (projects.length > 1 && idx === 2) {
        const secondProj = projects[1];
        if (secondProj && secondProj.name) {
          questionText = `Regarding your project "${secondProj.name}", what testing, deployment, and reliability practices did you implement to ensure production stability?`;
        }
      } else if (idx === 0 && Array.isArray(parsedResume.skills) && parsedResume.skills.length > 0) {
        const topSkills = parsedResume.skills.slice(0, 3).join(', ');
        if (!questionText.includes('In your project')) {
          questionText = `Given your background with ${topSkills}, ${questionText.charAt(0).toLowerCase() + questionText.slice(1)}`;
        }
      }
    }

    return {
      questionNumber: idx + 1,
      questionText,
      category: q.category || 'Technical',
      expectedKeyPoints: Array.isArray(q.expectedKeyPoints) && q.expectedKeyPoints.length > 0
        ? [...q.expectedKeyPoints]
        : ['Clear technical explanation', 'Architecture understanding', 'Trade-off analysis'],
      hints: Array.isArray(q.hints) && q.hints.length > 0
        ? [...q.hints]
        : ['Focus on structured communication and concrete technical steps.'],
    };
  });

  // Populate cache for standard requests (storing deep clone)
  if (!parsedResume) {
    questionCache.set(cacheKey, deepCloneQuestions(finalQuestions));
    // Prune cache if it grows beyond 100 entries (LRU-style)
    if (questionCache.size > 100) {
      const oldestKey = questionCache.keys().next().value;
      questionCache.delete(oldestKey);
    }
  }

  return deepCloneQuestions(finalQuestions);
};
