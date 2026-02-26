export interface OfficialSample {
  id: number
  title: string
  description: string
  source: string
  category: string
  options: Record<string, unknown>
}

function trimSourceTrailingSpaces(source: string): string {
  return source
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
}

export const OFFICIAL_SAMPLE_CATEGORIES: string[] = [
  'Basic',
  'Flowchart',
  'State',
  'Sequence',
  'Class',
  'ER',
]

const RAW_OFFICIAL_SAMPLES: OfficialSample[] = [
  {
    id: 0,
    title: 'Beautiful Mermaid',
    description: 'Mermaid rendering, made beautiful.',
    source:
      'stateDiagram-v2\n    direction LR\n    [*] --> Input\n    Input --> Parse: DSL\n    Parse --> Layout: AST\n    Layout --> SVG: Vector\n    Layout --> ASCII: Text\n    SVG --> Theme\n    ASCII --> Theme\n    Theme --> Output\n    Output --> [*]',
    category: 'Basic',
    options: {
      transparent: true,
    },
  },
  {
    id: 1,
    title: 'Simple Flow',
    description: 'Basic linear flow with three nodes connected by solid arrows.',
    source: 'graph TD\n  A[Start] --> B[Process] --> C[End]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 2,
    title: 'Original Node Shapes',
    description: 'Rectangle, rounded, diamond, stadium, and circle.',
    source:
      'graph LR\n  A[Rectangle] --> B(Rounded)\n  B --> C{Diamond}\n  C --> D([Stadium])\n  D --> E((Circle))',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 3,
    title: 'Batch 1 Shapes',
    description: 'Subroutine `[[text]]`, double circle `(((text)))`, and hexagon `{{text}}`.',
    source: 'graph LR\n  A[[Subroutine]] --> B(((Double Circle)))\n  B --> C{{Hexagon}}',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 4,
    title: 'Batch 2 Shapes',
    description:
      'Cylinder `[(text)]`, asymmetric `>text]`, trapezoid `[/text\\]`, and inverse trapezoid `[\\text/]`.',
    source:
      'graph LR\n  A[(Database)] --> B>Flag Shape]\n  B --> C[/Wider Bottom\\]\n  C --> D[\\Wider Top/]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 5,
    title: 'All 12 Flowchart Shapes',
    description: 'Every supported flowchart shape in a single diagram.',
    source:
      'graph LR\n  A[Rectangle] --> B(Rounded)\n  B --> C{Diamond}\n  C --> D([Stadium])\n  D --> E((Circle))\n  E --> F[[Subroutine]]\n  F --> G(((Double Circle)))\n  G --> H{{Hexagon}}\n  H --> I[(Database)]\n  I --> J>Flag]\n  J --> K[/Trapezoid\\]\n  K --> L[\\Inverse Trap/]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 6,
    title: 'All Edge Styles',
    description: 'Solid, dotted, and thick arrows with labels.',
    source:
      'graph TD\n  A[Source] -->|solid| B[Target 1]\n  A -.->|dotted| C[Target 2]\n  A ==>|thick| D[Target 3]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 7,
    title: 'No-Arrow Edges',
    description: 'Lines without arrowheads: solid `---`, dotted `-.-`, thick `===`.',
    source: 'graph TD\n  A[Node 1] ---|related| B[Node 2]\n  B -.- C[Node 3]\n  C === D[Node 4]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 8,
    title: 'Bidirectional Arrows',
    description: 'Arrows in both directions: `<-->`, `<-.->`, `<==>`.',
    source:
      'graph LR\n  A[Client] <-->|sync| B[Server]\n  B <-.->|heartbeat| C[Monitor]\n  C <==>|data| D[Storage]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 9,
    title: 'Parallel Links (&)',
    description: 'Using `&` to create multiple edges from/to groups of nodes.',
    source: 'graph TD\n  A[Input] & B[Config] --> C[Processor]\n  C --> D[Output] & E[Log]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 10,
    title: 'Chained Edges',
    description: 'A long chain of nodes demonstrating edge chaining syntax.',
    source: 'graph LR\n  A[Step 1] --> B[Step 2] --> C[Step 3] --> D[Step 4] --> E[Step 5]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 11,
    title: 'Direction: Left-Right (LR)',
    description: 'Horizontal layout flowing left to right.',
    source: 'graph LR\n  A[Input] --> B[Transform] --> C[Output]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 12,
    title: 'Direction: Bottom-Top (BT)',
    description: 'Vertical layout flowing from bottom to top.',
    source: 'graph BT\n  A[Foundation] --> B[Layer 2] --> C[Top]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 13,
    title: 'Subgraphs',
    description: 'Grouped nodes inside labeled subgraph containers.',
    source:
      'graph TD\n  subgraph Frontend\n    A[React App] --> B[State Manager]\n  end\n  subgraph Backend\n    C[API Server] --> D[Database]\n  end\n  B --> C',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 14,
    title: 'Nested Subgraphs',
    description: 'Subgraphs inside subgraphs for hierarchical grouping.',
    source:
      'graph TD\n  subgraph Cloud\n    subgraph us-east [US East Region]\n      A[Web Server] --> B[App Server]\n    end\n    subgraph us-west [US West Region]\n      C[Web Server] --> D[App Server]\n    end\n  end\n  E[Load Balancer] --> A\n  E --> C',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 15,
    title: 'Subgraph Direction Override',
    description: 'Using `direction LR` inside a subgraph while the outer graph flows TD.',
    source:
      'graph TD\n  subgraph pipeline [Processing Pipeline]\n    direction LR\n    A[Input] --> B[Parse] --> C[Transform] --> D[Output]\n  end\n  E[Source] --> A\n  D --> F[Sink]',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 16,
    title: '::: Class Shorthand',
    description: 'Assigning classes with `:::` syntax directly on node definitions.',
    source:
      'graph TD\n  A[Normal]:::default --> B[Highlighted]:::highlight --> C[Error]:::error\n  classDef default fill:#f4f4f5,stroke:#a1a1aa\n  classDef highlight fill:#fbbf24,stroke:#d97706\n  classDef error fill:#ef4444,stroke:#dc2626',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 17,
    title: 'Inline Style Overrides',
    description: 'Using `style` statements to override node fill and stroke colors.',
    source:
      'graph TD\n  A[Default] --> B[Custom Colors] --> C[Another Custom]\n  style B fill:#3b82f6,stroke:#1d4ed8,color:#ffffff\n  style C fill:#10b981,stroke:#059669',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 18,
    title: 'CI/CD Pipeline',
    description:
      'A realistic CI/CD pipeline with decision points, feedback loops, and deployment stages.',
    source:
      'graph TD\n  subgraph ci [CI Pipeline]\n    A[Push Code] --> B{Tests Pass?}\n    B -->|Yes| C[Build Image]\n    B -->|No| D[Fix & Retry]\n    D -.-> A\n  end\n  C --> E([Deploy Staging])\n  E --> F{QA Approved?}\n  F -->|Yes| G((Production))\n  F -->|No| D',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 19,
    title: 'System Architecture',
    description: 'A microservices architecture with multiple services and data stores.',
    source:
      'graph LR\n  subgraph clients [Client Layer]\n    A([Web App]) --> B[API Gateway]\n    C([Mobile App]) --> B\n  end\n  subgraph services [Service Layer]\n    B --> D[Auth Service]\n    B --> E[User Service]\n    B --> F[Order Service]\n  end\n  subgraph data [Data Layer]\n    D --> G[(Auth DB)]\n    E --> H[(User DB)]\n    F --> I[(Order DB)]\n    F --> J([Message Queue])\n  end',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 20,
    title: 'Decision Tree',
    description: 'A branching decision flowchart with multiple outcomes.',
    source:
      'graph TD\n  A{Is it raining?} -->|Yes| B{Have umbrella?}\n  A -->|No| C([Go outside])\n  B -->|Yes| D([Go with umbrella])\n  B -->|No| E{Is it heavy?}\n  E -->|Yes| F([Stay inside])\n  E -->|No| G([Run for it])',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 21,
    title: 'Git Branching Workflow',
    description: 'A git flow showing feature branches, PRs, and release cycle.',
    source:
      'graph LR\n  A[main] --> B[develop]\n  B --> C[feature/auth]\n  B --> D[feature/ui]\n  C --> E{PR Review}\n  D --> E\n  E -->|approved| B\n  B --> F[release/1.0]\n  F --> G{Tests?}\n  G -->|pass| A\n  G -->|fail| F',
    category: 'Flowchart',
    options: {},
  },
  {
    id: 22,
    title: 'Basic State Diagram',
    description: 'A simple `stateDiagram-v2` with start/end pseudostates and transitions.',
    source:
      'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active : start\n  Active --> Idle : cancel\n  Active --> Done : complete\n  Done --> [*]',
    category: 'State',
    options: {},
  },
  {
    id: 23,
    title: 'State: Composite States',
    description: 'Nested composite states with inner transitions.',
    source:
      'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Processing : submit\n  state Processing {\n    parse --> validate\n    validate --> execute\n  }\n  Processing --> Complete : done\n  Processing --> Error : fail\n  Error --> Idle : retry\n  Complete --> [*]',
    category: 'State',
    options: {},
  },
  {
    id: 24,
    title: 'State: Connection Lifecycle',
    description: 'TCP-like connection state machine with multiple states.',
    source:
      'stateDiagram-v2\n  [*] --> Closed\n  Closed --> Connecting : connect\n  Connecting --> Connected : success\n  Connecting --> Closed : timeout\n  Connected --> Disconnecting : close\n  Connected --> Reconnecting : error\n  Reconnecting --> Connected : success\n  Reconnecting --> Closed : max_retries\n  Disconnecting --> Closed : done\n  Closed --> [*]',
    category: 'State',
    options: {},
  },
  {
    id: 25,
    title: 'Sequence: Basic Messages',
    description: 'Simple request/response between two participants.',
    source: 'sequenceDiagram\n  Alice->>Bob: Hello Bob!\n  Bob-->>Alice: Hi Alice!',
    category: 'Sequence',
    options: {},
  },
  {
    id: 26,
    title: 'Sequence: Participant Aliases',
    description: 'Using `participant ... as ...` for compact diagram IDs with readable labels.',
    source:
      'sequenceDiagram\n  participant A as Alice\n  participant B as Bob\n  participant C as Charlie\n  A->>B: Hello\n  B->>C: Forward\n  C-->>A: Reply',
    category: 'Sequence',
    options: {},
  },
  {
    id: 27,
    title: 'Sequence: Actor Stick Figures',
    description: 'Using `actor` instead of `participant` renders stick figures instead of boxes.',
    source:
      'sequenceDiagram\n  actor U as User\n  participant S as System\n  participant DB as Database\n  U->>S: Click button\n  S->>DB: Query\n  DB-->>S: Results\n  S-->>U: Display',
    category: 'Sequence',
    options: {},
  },
  {
    id: 28,
    title: 'Sequence: Arrow Types',
    description:
      'All arrow types: solid `->>` and dashed `-->>` with filled arrowheads, open arrows `-)` .',
    source:
      'sequenceDiagram\n  A->>B: Solid arrow (sync)\n  B-->>A: Dashed arrow (return)\n  A-)B: Open arrow (async)\n  B--)A: Open dashed arrow',
    category: 'Sequence',
    options: {},
  },
  {
    id: 29,
    title: 'Sequence: Activation Boxes',
    description: 'Using `+` and `-` to show when participants are active.',
    source:
      'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>+S: Request\n  S->>+S: Process\n  S->>-S: Done\n  S-->>-C: Response',
    category: 'Sequence',
    options: {},
  },
  {
    id: 30,
    title: 'Sequence: Self-Messages',
    description: 'A participant sending a message to itself (displayed as a loop arrow).',
    source:
      'sequenceDiagram\n  participant S as Server\n  S->>S: Internal process\n  S->>S: Validate\n  S-->>S: Log',
    category: 'Sequence',
    options: {},
  },
  {
    id: 31,
    title: 'Sequence: Loop Block',
    description: 'A `loop` construct wrapping repeated message exchanges.',
    source:
      'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: Connect\n  loop Every 30s\n    C->>S: Heartbeat\n    S-->>C: Ack\n  end\n  C->>S: Disconnect',
    category: 'Sequence',
    options: {},
  },
  {
    id: 32,
    title: 'Sequence: Alt/Else Block',
    description: 'Conditional branching with `alt` (if) and `else` blocks.',
    source:
      'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: Login\n  alt Valid credentials\n    S-->>C: 200 OK\n  else Invalid\n    S-->>C: 401 Unauthorized\n  else Account locked\n    S-->>C: 403 Forbidden\n  end',
    category: 'Sequence',
    options: {},
  },
  {
    id: 33,
    title: 'Sequence: Opt Block',
    description: 'Optional block — executes only if condition is met.',
    source:
      'sequenceDiagram\n  participant A as App\n  participant C as Cache\n  participant DB as Database\n  A->>C: Get data\n  C-->>A: Cache miss\n  opt Cache miss\n    A->>DB: Query\n    DB-->>A: Results\n    A->>C: Store in cache\n  end',
    category: 'Sequence',
    options: {},
  },
  {
    id: 34,
    title: 'Sequence: Par Block',
    description: 'Parallel execution with `par`/`and` constructs.',
    source:
      'sequenceDiagram\n  participant C as Client\n  participant A as AuthService\n  participant U as UserService\n  participant O as OrderService\n  C->>A: Authenticate\n  par Fetch user data\n    A->>U: Get profile\n  and Fetch orders\n    A->>O: Get orders\n  end\n  A-->>C: Combined response',
    category: 'Sequence',
    options: {},
  },
  {
    id: 35,
    title: 'Sequence: Critical Block',
    description: 'Critical section that must complete atomically.',
    source:
      'sequenceDiagram\n  participant A as App\n  participant DB as Database\n  A->>DB: BEGIN\n  critical Transaction\n    A->>DB: UPDATE accounts\n    A->>DB: INSERT log\n  end\n  A->>DB: COMMIT',
    category: 'Sequence',
    options: {},
  },
  {
    id: 36,
    title: 'Sequence: Notes (Right/Left/Over)',
    description: 'Notes positioned to the right, left, or over participants.',
    source:
      'sequenceDiagram\n  participant A as Alice\n  participant B as Bob\n  Note left of A: Alice prepares\n  A->>B: Hello\n  Note right of B: Bob thinks\n  B-->>A: Reply\n  Note over A,B: Conversation complete',
    category: 'Sequence',
    options: {},
  },
  {
    id: 37,
    title: 'Sequence: OAuth 2.0 Flow',
    description: 'Full OAuth 2.0 authorization code flow with token exchange.',
    source:
      'sequenceDiagram\n  actor U as User\n  participant App as Client App\n  participant Auth as Auth Server\n  participant API as Resource API\n  U->>App: Click Login\n  App->>Auth: Authorization request\n  Auth->>U: Login page\n  U->>Auth: Credentials\n  Auth-->>App: Authorization code\n  App->>Auth: Exchange code for token\n  Auth-->>App: Access token\n  App->>API: Request + token\n  API-->>App: Protected resource\n  App-->>U: Display data',
    category: 'Sequence',
    options: {},
  },
  {
    id: 38,
    title: 'Sequence: Database Transaction',
    description: 'Multi-step database transaction with rollback handling.',
    source:
      'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  participant DB as Database\n  C->>S: POST /transfer\n  S->>DB: BEGIN\n  S->>DB: Debit account A\n  alt Success\n    S->>DB: Credit account B\n    S->>DB: INSERT audit_log\n    S->>DB: COMMIT\n    S-->>C: 200 OK\n  else Insufficient funds\n    S->>DB: ROLLBACK\n    S-->>C: 400 Bad Request\n  end',
    category: 'Sequence',
    options: {},
  },
  {
    id: 39,
    title: 'Sequence: Microservice Orchestration',
    description: 'Complex multi-service flow with parallel calls and error handling.',
    source:
      'sequenceDiagram\n  participant G as Gateway\n  participant A as Auth\n  participant U as Users\n  participant O as Orders\n  participant N as Notify\n  G->>A: Validate token\n  A-->>G: Valid\n  par Fetch data\n    G->>U: Get user\n    U-->>G: User data\n  and\n    G->>O: Get orders\n    O-->>G: Order list\n  end\n  G->>N: Send notification\n  N-->>G: Queued\n  Note over G: Aggregate response',
    category: 'Sequence',
    options: {},
  },
  {
    id: 40,
    title: 'Class: Basic Class',
    description: 'A single class with attributes and methods, rendered as a 3-compartment box.',
    source:
      'classDiagram\n  class Animal {\n    +String name\n    +int age\n    +eat() void\n    +sleep() void\n  }',
    category: 'Class',
    options: {},
  },
  {
    id: 41,
    title: 'Class: Visibility Markers',
    description:
      'All four visibility levels: `+` (public), `-` (private), `#` (protected), `~` (package).',
    source:
      'classDiagram\n  class User {\n    +String name\n    -String password\n    #int internalId\n    ~String packageField\n    +login() bool\n    -hashPassword() String\n    #validate() void\n    ~notify() void\n  }',
    category: 'Class',
    options: {},
  },
  {
    id: 42,
    title: 'Class: Interface Annotation',
    description: 'Using `<<interface>>` annotation above the class name.',
    source:
      'classDiagram\n  class Serializable {\n    <<interface>>\n    +serialize() String\n    +deserialize(data) void\n  }',
    category: 'Class',
    options: {},
  },
  {
    id: 43,
    title: 'Class: Abstract Annotation',
    description: 'Using `<<abstract>>` annotation for abstract classes.',
    source:
      'classDiagram\n  class Shape {\n    <<abstract>>\n    +String color\n    +area() double\n    +draw() void\n  }',
    category: 'Class',
    options: {},
  },
  {
    id: 44,
    title: 'Class: Enum Annotation',
    description: 'Using `<<enumeration>>` annotation for enum types.',
    source:
      'classDiagram\n  class Status {\n    <<enumeration>>\n    ACTIVE\n    INACTIVE\n    PENDING\n    DELETED\n  }',
    category: 'Class',
    options: {},
  },
  {
    id: 45,
    title: 'Class: Inheritance (<|--)',
    description: 'Inheritance relationship rendered with a hollow triangle marker.',
    source:
      'classDiagram\n  class Animal {\n    +String name\n    +eat() void\n  }\n  class Dog {\n    +String breed\n    +bark() void\n  }\n  class Cat {\n    +bool isIndoor\n    +meow() void\n  }\n  Animal <|-- Dog\n  Animal <|-- Cat',
    category: 'Class',
    options: {},
  },
  {
    id: 46,
    title: 'Class: Composition (*--)',
    description: 'Composition — "owns" relationship with filled diamond marker.',
    source:
      'classDiagram\n  class Car {\n    +String model\n    +start() void\n  }\n  class Engine {\n    +int horsepower\n    +rev() void\n  }\n  Car *-- Engine',
    category: 'Class',
    options: {},
  },
  {
    id: 47,
    title: 'Class: Aggregation (o--)',
    description: 'Aggregation — "has" relationship with hollow diamond marker.',
    source:
      'classDiagram\n  class University {\n    +String name\n  }\n  class Department {\n    +String faculty\n  }\n  University o-- Department',
    category: 'Class',
    options: {},
  },
  {
    id: 48,
    title: 'Class: Association (-->)',
    description: 'Basic association — simple directed arrow.',
    source:
      'classDiagram\n  class Customer {\n    +String name\n  }\n  class Order {\n    +int orderId\n  }\n  Customer --> Order',
    category: 'Class',
    options: {},
  },
  {
    id: 49,
    title: 'Class: Dependency (..>)',
    description: 'Dependency — dashed line with open arrow.',
    source:
      'classDiagram\n  class Service {\n    +process() void\n  }\n  class Repository {\n    +find() Object\n  }\n  Service ..> Repository',
    category: 'Class',
    options: {},
  },
  {
    id: 50,
    title: 'Class: Realization (..|>)',
    description: 'Realization — dashed line with hollow triangle (implements interface).',
    source:
      'classDiagram\n  class Flyable {\n    <<interface>>\n    +fly() void\n  }\n  class Bird {\n    +fly() void\n    +sing() void\n  }\n  Bird ..|> Flyable',
    category: 'Class',
    options: {},
  },
  {
    id: 51,
    title: 'Class: All 6 Relationship Types',
    description: 'Every relationship type in a single diagram for comparison.',
    source:
      'classDiagram\n  A <|-- B : inheritance\n  C *-- D : composition\n  E o-- F : aggregation\n  G --> H : association\n  I ..> J : dependency\n  K ..|> L : realization',
    category: 'Class',
    options: {},
  },
  {
    id: 52,
    title: 'Class: Relationship Labels',
    description: 'Labeled relationships between classes with descriptive text.',
    source:
      'classDiagram\n  class Teacher {\n    +String name\n  }\n  class Student {\n    +String name\n  }\n  class Course {\n    +String title\n  }\n  Teacher --> Course : teaches\n  Student --> Course : enrolled in',
    category: 'Class',
    options: {},
  },
  {
    id: 53,
    title: 'Class: Design Pattern — Observer',
    description:
      'The Observer (publish-subscribe) design pattern with interface + concrete implementations.',
    source:
      'classDiagram\n  class Subject {\n    <<interface>>\n    +attach(Observer) void\n    +detach(Observer) void\n    +notify() void\n  }\n  class Observer {\n    <<interface>>\n    +update() void\n  }\n  class EventEmitter {\n    -List~Observer~ observers\n    +attach(Observer) void\n    +detach(Observer) void\n    +notify() void\n  }\n  class Logger {\n    +update() void\n  }\n  class Alerter {\n    +update() void\n  }\n  Subject <|.. EventEmitter\n  Observer <|.. Logger\n  Observer <|.. Alerter\n  EventEmitter --> Observer',
    category: 'Class',
    options: {},
  },
  {
    id: 54,
    title: 'Class: MVC Architecture',
    description: 'Model-View-Controller pattern showing relationships between layers.',
    source:
      'classDiagram\n  class Model {\n    -data Map\n    +getData() Map\n    +setData(key, val) void\n    +notify() void\n  }\n  class View {\n    -model Model\n    +render() void\n    +update() void\n  }\n  class Controller {\n    -model Model\n    -view View\n    +handleInput(event) void\n    +updateModel(data) void\n  }\n  Controller --> Model : updates\n  Controller --> View : refreshes\n  View --> Model : reads\n  Model ..> View : notifies',
    category: 'Class',
    options: {},
  },
  {
    id: 55,
    title: 'Class: Full Hierarchy',
    description: 'A complete class hierarchy with abstract base, interfaces, and concrete classes.',
    source:
      'classDiagram\n  class Animal {\n    <<abstract>>\n    +String name\n    +int age\n    +eat() void\n    +sleep() void\n  }\n  class Mammal {\n    +bool warmBlooded\n    +nurse() void\n  }\n  class Bird {\n    +bool canFly\n    +layEggs() void\n  }\n  class Dog {\n    +String breed\n    +bark() void\n  }\n  class Cat {\n    +bool isIndoor\n    +purr() void\n  }\n  class Parrot {\n    +String vocabulary\n    +speak() void\n  }\n  Animal <|-- Mammal\n  Animal <|-- Bird\n  Mammal <|-- Dog\n  Mammal <|-- Cat\n  Bird <|-- Parrot',
    category: 'Class',
    options: {},
  },
  {
    id: 56,
    title: 'ER: Basic Relationship',
    description: 'A simple one-to-many relationship between two entities.',
    source: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
    category: 'ER',
    options: {},
  },
  {
    id: 57,
    title: 'ER: Entity with Attributes',
    description: 'An entity with typed attributes and `PK`/`FK`/`UK` key badges.',
    source:
      'erDiagram\n  CUSTOMER {\n    int id PK\n    string name\n    string email UK\n    date created_at\n  }',
    category: 'ER',
    options: {},
  },
  {
    id: 58,
    title: 'ER: Attribute Keys (PK, FK, UK)',
    description: 'All three key constraint types rendered as badges.',
    source:
      'erDiagram\n  ORDER {\n    int id PK\n    int customer_id FK\n    string invoice_number UK\n    decimal total\n    date order_date\n    string status\n  }',
    category: 'ER',
    options: {},
  },
  {
    id: 59,
    title: 'ER: Exactly One to Exactly One (||--||)',
    description: 'One-to-one mandatory relationship.',
    source: 'erDiagram\n  PERSON ||--|| PASSPORT : has',
    category: 'ER',
    options: {},
  },
  {
    id: 60,
    title: 'ER: Exactly One to Zero-or-Many (||--o{)',
    description: "Classic one-to-many optional relationship (crow's foot).",
    source: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
    category: 'ER',
    options: {},
  },
  {
    id: 61,
    title: 'ER: Zero-or-One to One-or-Many (|o--|{)',
    description: 'Optional on one side, at-least-one on the other.',
    source: 'erDiagram\n  SUPERVISOR |o--|{ EMPLOYEE : manages',
    category: 'ER',
    options: {},
  },
  {
    id: 62,
    title: 'ER: One-or-More to Zero-or-Many (}|--o{)',
    description: 'At-least-one to zero-or-many relationship.',
    source: 'erDiagram\n  TEACHER }|--o{ COURSE : teaches',
    category: 'ER',
    options: {},
  },
  {
    id: 63,
    title: 'ER: All Cardinality Types',
    description: 'Every cardinality combination in one diagram.',
    source:
      'erDiagram\n  A ||--|| B : one-to-one\n  C ||--o{ D : one-to-many\n  E |o--|{ F : opt-to-many\n  G }|--o{ H : many-to-many',
    category: 'ER',
    options: {},
  },
  {
    id: 64,
    title: 'ER: Identifying (Solid) Relationship',
    description:
      'Solid line indicating an identifying relationship (child depends on parent for identity).',
    source: 'erDiagram\n  ORDER ||--|{ LINE_ITEM : contains',
    category: 'ER',
    options: {},
  },
  {
    id: 65,
    title: 'ER: Non-Identifying (Dashed) Relationship',
    description: 'Dashed line indicating a non-identifying relationship.',
    source: 'erDiagram\n  USER ||..o{ LOG_ENTRY : generates\n  USER ||..o{ SESSION : opens',
    category: 'ER',
    options: {},
  },
  {
    id: 66,
    title: 'ER: Mixed Identifying & Non-Identifying',
    description: 'Both solid and dashed lines in the same diagram.',
    source:
      'erDiagram\n  ORDER ||--|{ LINE_ITEM : contains\n  ORDER ||..o{ SHIPMENT : ships-via\n  PRODUCT ||--o{ LINE_ITEM : includes\n  PRODUCT ||..o{ REVIEW : receives',
    category: 'ER',
    options: {},
  },
  {
    id: 67,
    title: 'ER: E-Commerce Schema',
    description:
      'Full e-commerce database schema with customers, orders, products, and line items.',
    source:
      'erDiagram\n  CUSTOMER {\n    int id PK\n    string name\n    string email UK\n  }\n  ORDER {\n    int id PK\n    date created\n    int customer_id FK\n  }\n  PRODUCT {\n    int id PK\n    string name\n    float price\n  }\n  LINE_ITEM {\n    int id PK\n    int order_id FK\n    int product_id FK\n    int quantity\n  }\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  PRODUCT ||--o{ LINE_ITEM : includes',
    category: 'ER',
    options: {},
  },
  {
    id: 68,
    title: 'ER: Blog Platform Schema',
    description: 'Blog system with users, posts, comments, and tags.',
    source:
      'erDiagram\n  USER {\n    int id PK\n    string username UK\n    string email UK\n    date joined\n  }\n  POST {\n    int id PK\n    string title\n    text content\n    int author_id FK\n    date published\n  }\n  COMMENT {\n    int id PK\n    text body\n    int post_id FK\n    int user_id FK\n    date created\n  }\n  TAG {\n    int id PK\n    string name UK\n  }\n  USER ||--o{ POST : writes\n  USER ||--o{ COMMENT : authors\n  POST ||--o{ COMMENT : has\n  POST }|--o{ TAG : tagged-with',
    category: 'ER',
    options: {},
  },
  {
    id: 69,
    title: 'ER: School Management Schema',
    description: 'School system with students, teachers, courses, and enrollments.',
    source:
      'erDiagram\n  STUDENT {\n    int id PK\n    string name\n    date dob\n    string grade\n  }\n  TEACHER {\n    int id PK\n    string name\n    string department\n  }\n  COURSE {\n    int id PK\n    string title\n    int teacher_id FK\n    int credits\n  }\n  ENROLLMENT {\n    int id PK\n    int student_id FK\n    int course_id FK\n    string semester\n    float grade\n  }\n  TEACHER ||--o{ COURSE : teaches\n  STUDENT ||--o{ ENROLLMENT : enrolled\n  COURSE ||--o{ ENROLLMENT : has',
    category: 'ER',
    options: {},
  },
]

export const OFFICIAL_SAMPLES: OfficialSample[] = RAW_OFFICIAL_SAMPLES.map((sample) => ({
  ...sample,
  source: trimSourceTrailingSpaces(sample.source),
}))
