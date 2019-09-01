# LowChat

This app looks simple, but it's actually packed with tons of client and server features.

## Client Commands

### General

**/users**

Prints the user list

**/share**

Prints a shareable URL for the current room

### Moderator

**/op [username]**

Ops a user

**/deop [username]**

Deops a user

**/ops**

Prints the ops list

**/kick [username]**

Kicks a user

**/ban [username]**

Bans a user¹

**/unban [username]**

Unbans a user¹

¹    Bans work by blocking the target's IP address access to the room. IP's are managed on the server, so moderators do not have to worry about finding an IP. Admin commands are mirrored off of the moderator commands except bans work as a server-wide block of access to the entire site.
