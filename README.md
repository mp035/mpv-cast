# mpv-cast

This is an application to allow you to remotely control an MPV media player instance on a HTPC (or any Linux machine) on your home network via a web browser.

## How to use

### Clone the repository on a Linux Machine (This will be the SERVER and will display the videos)

    git clone https://github.com/mp035/mpv-cast.git
### Install mpv

    sudo pacman -S mpv
    
or

    sudo apt install mpv
### Install nodejs (via NVM)
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
    
    nvm install lts/hydrogen

    nvm use lts/hydrogen

### (Optional) set node 18 as default so you don't have to run "`nvm use lts/hydrogen`" everytime
    nvm alias default lts/hydrogen

### Install client packages and build the client
    cd mpv-cast/client
    npm install
    npm run build

### Install required npm packages and start the server
    cd ../server
    npm install
    node index.js

The IP address of the SERVER will be displayed in the console output. Go to another device on your home network (eg. your phone connected to WiFi), open a web browser and enter `http://<IP_ADDRESS>:3000` into the url bar.  You should be greeted with the remote control interface, from there you can navigate the file system and start playing videos on the SERVER.