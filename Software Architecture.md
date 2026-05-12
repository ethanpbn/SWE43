# **Software Architecture Document: Cafe-Finder App**

## **Architectural Summary**

The Cafe-Finder application is built using a Client-Server architectural design style, specifically a Three-Tier Architecture. The primary **components** include a Mobile Client (User Interface), a Backend Web Server (Logic Layer), and a Database (Data Layer). **Connectors** facilitating these interactions include RESTful APIs and database drivers. The Mobile Client **runs** locally on the user's smartphone (laptop/mobile device) to provide a responsive UI. The Backend Web Server and Database run in the **cloud** (e.g., AWS or GCP) to ensure high availability, scalability, and centralized data management for cafe listings and user reviews.

## **Platforms & Languages**

The following table outlines the hardware, OS, and language choices for the Cafe-Finder app, including a tradeoff analysis for each.

| Layer | Choice (Hardware/OS/Runtime/Language) | Benefits | Tradeoffs |
| :---- | :---- | :---- | :---- |
| **Frontend** | React Native / iOS & Android / JavaScript | Cross-platform compatibility with a single codebase; fast development cycle. | Slower and heavier on the battery as it needs an interpreter in between to talk to components (like Python) |
| **Backend** | Node.js / Linux (Ubuntu) / Cloud VM / TypeScript | Asynchronous I/O handles many concurrent users efficiently; TypeScript adds type safety. | Struggles with heavy CPU math. [Node.js](http://Node.js) can get stuck on large math operations and become temporarily unresponsive |
| **Database** | PostgreSQL / Managed Cloud Service / SQL | Best-in-class location/map tools. Can handle questions like "Find all cafes within a 500m radius of this user" extremely fast and accurately. | Steep learning curve for setup (requires a separate server process, user permissions, and more complex configuration) |

## 

## **Communication Protocols**

| Part of Stack | Protocol | Pro | Con |
| :---- | :---- | :---- | :---- |
| Frontend-Backend | HTTP | Every browser, mobile phone, and server understands it; no special firewall setup needed.  HTTP has built-in headers that tell the browser to "remember" a response; Great for "heavy" data like menus or photos (caching) Very easy to test and see data in the browser; fixing bugs significantly faster for a student team | One-way only; server cannot "push" data to the user. Server can’t send data on its own Every single HTTP request requires a "TCP Handshake" (a series of back-and-forth messages to establish security); Slow for small frequent messages sent back and forth Client can’t see changes until they manually refresh or the app sends a *new* request  |
| Backend-Database | PostgreSQL | **PostGIS** makes complex distance math easy and fast. CAn run can run a simple query: `Find all cafes within 500m of this GPS point`  Guaranteed data safety; no lost or corrupted info; database will block any data that breaks any rule we place Very organized; handles relationships (Users → Cafes) perfectly; it supports almost every data type, from standard text to complex "JSON" blocks | Overkill for very simple apps that don't need distance math.; our app does not exactly need this right now Higher "setup cost" and configuration time for the team; might be a hard spot to setup and debug for us "Rigid" structure requires extra steps (migrations) to change; every time we need to change the data it must perform a "Migration"—a script that updates the table structure  |
|  |  |  |  |

## **Component Functions \+ Connector Examples**

Below are the function names and data passed across connectors for key use-case flows:

**Use Case Flow**:

* User Favorites a Cafe  
  * User can click on star icon to favorite (Frontend.like\_cafe() → Post /api/favorites)  
  * Backend receives (Backend.like\_controller(cafe\_id) → SQL INSERT INTO favorite VALUES (?))  
  * DB adds in a row into favorites (somehow tells the backend that the operation is done)  
  * Backend responses with OK (200 message is sent back to Frontend)  
* Tab display  
  * User clicks on tab display to appear then sends a request (Frontend\_tab\_display() → Get /api/cafes)  
  * Backend receives and processes request. Queries the db (SQL Select \* FROM cafes)  
  * DB returns the rows and Backend responds with 200 OK   
  * Frontend maps the cafes on the tab display  
* Blocking Feature  
  * User clicks ‘Block’ on another user’s profile (frontend.block\_user() → POST /api/blocks {“”blockerID”: 100, “blockedID”; 199})  
  * Backend validates block and update permissions (INSERT INTO blocked\_user (blocker\_id, blocked\_id) VALUES (blockerID, blockedID))  
    * \*For all future requests (like "Show Nearby Friends"), the Backend will now perform a LEFT JOIN to exclude any blockedId results  
  * Backend responds with 200 OK  
  * UI should not display any blocked users into the user’s display  
* Notifications to send user location  
  * User clicks “Send location” (frontend.send\_location() using Websocket {”type”: “LOC\_REQ”, “groupID”: 789})  
  * Backend identifies everyone in the group whose groupID is 789   
  * Server logs request in an activity \_log table to auditing  
  * Server pushes a WebSocket notification to all active group members phones  
  * On UI, friends receive pop-up alert: “User X is at {insert cafe location}”  
* Searching For a Cafe  
  * User types cafe name into search bar (frontend.search\_cafe() → GET /api/cafes?search=cafe\_name)  
  * Backend sanitizes input to prevent injection and sends the query (backend.find\_cafe() → SQL SELECT \* FROM cafes WHERE name ILIKE '%Blue Bottle%'; )  
  * Database finds the results and returns them  
  * Backend returns a 200 OK and sends the info the frontend  
  * Frontend updates the state and shows the results (frontend.display\_search\_results())  
* Cafe Filtering  
  * User toggles “Open Now” filter chip (frontend.filter\_by() → GET /api/cafes?status=open)  
  * Backend identifies filter logic and requests only specific data (backend.request\_results() → SELECT \* FROM cafes WHERE is\_open \= True)  
  * DB returns the results and backend send 200 OK with the results  
  * UI filters the search to show filtered results  
* Group Feature  
  * User clicks “Create Group” and enters a name (frontend.create\_group() → POST /api/groups {“groupName”: name, “creatorID”: 123})  
  * Backend creates new group and assigns the user as admin (SQL INSERT INTO groups (group\_name, admin) Values (?, ?), also performs INSERT INTO group\_members the members of the group)  
  * UI redirects user to Group dashboard (frontend.show\_group\_dashboard())  
    * Within group dashboard, user has the option to invite others, make the group public invite, decide a name for the group, pick the location, a meetup time

**Use Case Flow \- Business**:

* Setting up own Cafe Page  
  * User goes to profile and selects "Create New Page” and enters their Cafe name \+ location  
  * User sets up cafe page with descriptions and images of their new location  
  * Info gets sent to backend API and once page is published, customer users will be able to see it and get recommended it  
* Group Feature  
  * User can click “Create Group/Event” and enter a name  
  * Backend creates new group and assigns the user as admin (SQL INSERT INTO groups (group\_name, admin) Values (?, ?), also performs INSERT INTO group\_members the members of the group)  
  * UI redirects user to Group dashboard (frontend.show\_group\_dashboard())  
    * From there business user can create more specifications like descriptions, time of event, location (if business has multiple pages), etc.  
  * Once posted will get sent to backend API so it can be displayed to customer users  
  * 

