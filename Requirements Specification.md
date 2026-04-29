Requirements Specification

**Title:**

Justin Johnson \- 23916760  
Vincent Vu \- 24237214  
Eric Chen \- 15405015  
Ethan Nguyen \- 14167608  
Colin Kendall \- 29706384

**Executive Summary**:  
Our app is a narrowed down “find my app” that caters towards cafes. The main goal of the app is to help users discover new cafes and meet new friends at these cafes, while supporting participating cafe businesses. The main audience for the cafe-hopping app would be regular people who like or want to go to cafes and the local cafe businesses. The app will be designed for users with various levels of social skills so it would be welcoming to as many different people as possible. The app will also support various features that local businesses can utilize to display info about the cafe to be inviting to new potential customers from the app.   
This passage will go over some features of the app for the user side. One feature is a mark down tool, using the cafe location, that the user can leave a review for others to see. Another feature is a notification system for any activities at cafe locations with friends that can be for chatting, studying, etc. The app will include a group system that is invite-only (major, hobbies, etc.).  
On the business side, the app can also provide an overview of the cafe’s menu provided by the cafe itself or app users that have already visited the cafe. The app may also provide other information about the cafe. This can include opening and closing times, most purchased items, a graph showing the times with the most volume of customers, etc. A display of various cafes, which are the most frequented can be added next to an averaged rating from users. Businesses who would like to promote their cafes can boost their spot on the display of cafes.  
	

**Application Context** 

**Users**

* Users who want to connect with others with similar interests  
* Businesses who want to advertise their services

**External Systems**

* Notification systems (SMS, push notifications)  
* GPS tracking (Find My)

**Hardware/Platforms**

* iOS and Android mobile devices  
* Web browser   
* Cloud servers for backend

**System Boundaries**

* Handles message requests between users in app  
* DOES NOT enforce meetups   
* Reporting only leads to in-app consequences

**Interactions**

* User sends message request → system sends message request to other user  
* User receives message request and accepts → system sends confirmation notification  
* User receives message request and rejects → system silently removes message request from this user’s display  
* User sends message → system sends message to other user  
* User updates filters → system processes new filters and updates map  
* User blocks another → system removes location and chatting from both sides  
* User reports another → system logs and processes report, which leads to suspension or removal  
* User disables location → removes location from map and removes others locations from their map

**Environmental Constraints**:

**Platform Constraints**

* Must run on iOS (version 15+) and Android (version 10+)  
* Must support modern web browsers (Chrome, Safari, Edge)

**Network Constraints**

* Handle connectivity issues and send intermittent request to fetch locations  
* Handle various mobile network connections (2G, 3G, 4G, 5G, Wi-Fi)
* Not limited in location (the users may be on the app any where they are)

**Hardware Constraints**

* Some features (i.e the markdown feature and the notification system) will require access to the device’s location and notification system   
  * May also need to get access and integrate with the devices mapping app to show locations of different cafes   
* Operate efficiently on low battery and/or limited memory

**Regulatory Constraints**

* Keep user data secure and private from businesses, comply with data privacy laws  
* Business promotions must abide by truth-in-advertising laws

**Performance Constraints**

* Requests should be handled within a few seconds of updating from user  
* System must be able to support numerous concurrent users

**Functional Requirements**:

| *Features* | *Description* | *Pros & Cons* | *Use Cases* |
| :---- | :---- | :---- | :---- |
| Favorite a cafe | The user can click on a marker over a location of a cafe to ‘favorite’ it (similar to bookmarking). They should also be able to perform this action on the tab display. | **Pros** Users can save cafes and hobbies they liked. Help match users with other people they might get along with **Cons** Interests of people may align, but it will not guarantee that people will get along | **Basic** The user will hover over a cafe marker, which should show a star icon. The user can click on the star and it should save the cafe as a ‘favorite’ **Alternative** Users can go into the tab display. Now users can go through and click through different cafes and ‘favorite’ the ones they went to **Exception** If a cafe does not appear in the map as a marker or in the tab display, then the user cannot ‘favorite’ that cafe, unless they add it in. |
| Tab display for cafes | There will be a layout for every cafe showing users location, menu, photos, ratings, if any friends are there right now, and more to get the user interested | **Pros** Gives cafe’s designated spots to showcase their personality **Cons** tabs may be unbalanced in size | **Basic** Users can click a tab to open and see if any of their friends are there right now in the home page. Businesses can register cafes and customize their tab in their profile page  **Alternative** Users search for a specific cafe and once they see the cafe they press on it and its tab pops up **Exception** User searches for a cafe that does not exist and therefore does not have a tab |
| Blocking Feature | Users can choose to block other users from seeing any and all activities from them | **Pros** Better security | **Basic** Users can block others if they are bullying them by searching their profile and clicking block **Alternative** Users can block users if they left an inappropriate review or send an inappropriate message to them **Exception** User searches for a profile that does not exist  |
| Notification to send user location | Once users are in a cafe, they can choose to send a notification to their friends of publicly to indicate they are at this cafe and want to socialize. Users can choose who sees the notification | **Pros** Allows users to achieve the purpose of this app and send a signal showing they want to socialize **Cons** Security \+ also security for the cafe if a ton of people decide to mob it | **Basic** A user arrives at the cafe and chooses to send a notification to their friends saying they are checking out this cafe now and would be happy for someone to join them **Alternative** Users can through the app schedule to send a notification when they know they are going to a cafe later **Exception** Users cannot send a notification in the cafe if the cafe has blocked the user |
| Searching for a Cafe  | A search bar that will recommend the user several cafes and allow them to search for a specific one to see reviews and if their friends have been | **Pros** Helps with local businesses Better user flow and allows users more control **Cons** Location dependent | **Basic** Businesses: can work with us through the software to register and have their café’s be searchable if new User can search for a specific cafe to see if any of their friends visited **Alternative** Users: can click on the search bar to see the most popular cafes right now in their area **Exception** Users search for a cafe that does not exist |
| Cafe Filtering | Users can search for cafes and filter out cafes based on locations, aesthetics, if they are good study spots, size, price, and more | **Pros** More user control \+ filtering based on user’s preferences **Cons** Defining cafes based on tags | **Basic** A user searches for cafes that are only in their area and serve coffee **Alternative** Users can filter through their friend’s current cafe locations by proximity **Exception** User applies too many filters and no cafe’s pop up |
| Group System | Similar to the notification feature, this app will also support a more refined “public notification” that acts as an invite for certain individuals. Think of it as creating a small party invite for talking about a certain show/movie or engaging in a certain hobby at a specific cafe. Businesses themselves can also choose to set up and plan these notifications if they want to host a certain event at their cafe. | **Pros** More socializing \+ meeting new people Having people with common interests meet up **Cons** Privacy and security Location dependent | **Basic** Businesses can create a “mahjong” night notification scheduled for a Friday night and those with profiles interested in games and socializing in the area will see a notification when they open the app. Users can create and view other people’s notifications and also see if any of their friends are going and how many people RSVP’d **Alternative** User can see other’s group notifications and decide if they want to send their own notification to tell their friends they are going to this event **Exception** Blocked users cannot RSVP or view a user’s event |


	**Group Ideas:** 

- Favorited list  
  - Be able to mark a cafe or hobby as a favorite  
    - This would tie into locations. Imagine having this preferred for something favorited  
- Maybe like a chat system so people can communicate with each other?  
  - I prefer an in-app messaging system  
  - Or like a link to socials  
- Privacy settings  
  - Toggle on/off location (Should this remove the locations of other people on the map?)  
- Frequented locations  
  - Tab that displays the frequented locations that are added by users  
  - Locations that have more adds are higher on display  
  - Used for ads/sponsored locations for business  
  - Could also be displayed on a different map  
    - If user want to disable location, this map can be displayed instead of map of people’s locations
