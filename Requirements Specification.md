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

**Functional Requirements (still needs work)**:

- Maybe users can specify a range/diameter to be notified when someone with the common interest enters that range  
- Should the app focus on a single interest or support multiple? For example, in the “multiple interests” version, a user could subscribe to “motorcycling” and “barbie doll collecting”  
- Should those interests be a set of pre-defined interests (i.e., decided by the app creators (you)) or open-ended (i.e., decided by the users)? (Based on hashtags? Or something else?)  
- Can you specify filtering criteria? Should those criteria be arbitrary (chosen by each user) or pre-defined? (For example, age ranges.)  
- Once joined up with a group (say, you have met up with a group and are going together on a ride), could members voice chat with all group members?  
- When someone is in range, you can chat with them? If there are multiple people in range, does it automatically create a group chat?  
- Should the “common interest” be strictly “common” or could it support diversity? For example, in the “common” mode, everyone must share the same interest, like “\#crocheting”. An example of “diversity” of interests would be one user plays guitar and is looking for people who play bass,  
- drums, and/or sings vocals.  
- Does the app only support impromptu group formation or does it support planned meet-ups? (For example, let’s plan to meet up Thursday evening at 6pm.)  
- Can group formation be “sticky” or is it only based on the dynamically changing location and range and common interest? For example, let’s say everyone within a campus group all subscribes to a shared “secret” tag.  
- Should there be a way to discover the interests of others in the surrounding area or not?  
- Should there be support for “public” interests (those that are discoverable in a directory of local interests in the range) and “private” interests (those that are not listed and the users would have had to communicated to share their group-id outside the app)?  
- Should there be a way to block a user? If so, what happens when User A blocks User X so neither User A can see User X nor vice versa. However, User X has the same interest as User A and User B. User B is visible and User X joins User B, and User A joins User B.  
- Are users completely anonymous (randomly generated identifier), have a user-chosen anonymous user name, or tied to one’s real name (maybe linked to a Facebook account or UCInetID)?

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

**Find My Ideas:**

- Bowling  
- Golf  
- Gym  
- Shows  
- Anime  
- Cafe hopping type  
-   
- Some kind of 2FA/security system for locations  
  - Like to avoid safety concerns

- Maybe like a chat system so people can communicate with each other?  
  - Or like a link to socials

