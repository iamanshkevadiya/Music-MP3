class MusicPlayer {
    constructor() {
        this.audioPlayer = new Audio();
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;

        // DOM Elements
        this.playBtn = document.getElementById('play');
        this.prevBtn = document.getElementById('prev');
        this.nextBtn = document.getElementById('next');
        this.shuffleBtn = document.getElementById('shuffle');
        this.repeatBtn = document.getElementById('repeat');
        this.volumeSlider = document.getElementById('volume');
        this.progress = document.getElementById('progress');
        this.songList = document.getElementById('song-list');
        this.currentSongDisplay = document.getElementById('current-song');
        this.addSongBtn = document.getElementById('add-song');
        this.songFileInput = document.getElementById('song-file');
        this.currentTimeDisplay = document.getElementById('current-time');
        this.durationDisplay = document.getElementById('duration');
        this.progressBar = document.querySelector('.progress-bar');

        // Initialize volume bar color
        this.volumeSlider.style.setProperty('--volume-percentage', '100%');

        // Load saved playlist from localStorage
        this.loadSavedPlaylist();
        
        // Add repeat state
        this.repeatMode = 'none'; // 'none', 'one', 'all'
        
        // Add shuffle state and history
        this.isShuffleOn = false;
        this.shuffleHistory = [];
        this.shuffleIndex = -1;
        
        // Initialize shuffle button state
        this.updateShuffleButtonState();
        
        this.initializeEventListeners();
        this.initializeProgressBar();
    }

    loadSavedPlaylist() {
        const savedPlaylist = localStorage.getItem('playlist');
        if (savedPlaylist) {
            const playlistData = JSON.parse(savedPlaylist);
            playlistData.forEach((song, index) => {
                const newSong = {
                    name: song.name,
                    data: song.data
                };
                this.playlist.push(newSong);
                this.addSongToList(newSong, this.playlist.length - 1);

                if (index === 0) {
                    this.loadSong(0);
                }
            });
        }
    }

    savePlaylist() {
        localStorage.setItem('playlist', JSON.stringify(this.playlist));
    }

    handleFileSelect(event) {
        const files = event.target.files;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const song = {
                    name: file.name,
                    data: e.target.result,
                    url: URL.createObjectURL(file)
                };
                this.playlist.push(song);
                this.addSongToList(song, this.playlist.length - 1);
                this.savePlaylist();

                if (this.playlist.length === 1) {
                    this.loadSong(0);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    initializeEventListeners() {
        // Play/Pause button
        this.playBtn.addEventListener('click', () => this.togglePlay());

        // Previous and Next buttons
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());

        // Volume control
        this.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.updateVolumeDisplay(value);
        });

        this.volumeSlider.addEventListener('mousedown', () => {
            this.volumeSlider.parentElement.classList.add('active');
        });

        this.volumeSlider.addEventListener('mouseup', () => {
            this.volumeSlider.parentElement.classList.remove('active');
        });

        // Progress bar update
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());

        // Song ended event
        this.audioPlayer.addEventListener('ended', () => this.playNext());

        // Add song button
        this.addSongBtn.addEventListener('click', () => this.songFileInput.click());
        this.songFileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Update time displays
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.durationDisplay.textContent = this.formatTime(this.audioPlayer.duration);
        });

        this.audioPlayer.addEventListener('timeupdate', () => {
            this.currentTimeDisplay.textContent = this.formatTime(this.audioPlayer.currentTime);
            this.updateProgress();
        });

        // Click on progress bar to seek
        this.progressBar.addEventListener('click', (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.audioPlayer.currentTime = pos * this.audioPlayer.duration;
        });

        // Volume icon click to mute/unmute
        const volumeIcon = document.querySelector('.volume-control i');
        volumeIcon.addEventListener('click', () => {
            if (this.audioPlayer.volume > 0) {
                this.updateVolumeDisplay(0);
            } else {
                this.updateVolumeDisplay(100);
            }
        });

        // Add repeat button event listener
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());

        // Add shuffle button event listener
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    }

    addSongToList(song, index) {
        const li = document.createElement('li');
        
        // Create song name span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = song.name;
        nameSpan.className = 'song-name';
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = 'delete-song';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.removeSong(index);
        };
        
        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        li.addEventListener('click', () => this.loadSong(index));
        
        this.songList.appendChild(li);
    }

    loadSong(index) {
        if (index >= 0 && index < this.playlist.length) {
            // Remove active class from all items
            const items = this.songList.querySelectorAll('li');
            items.forEach(item => item.classList.remove('active'));
            
            // Add active class to current song
            items[index].classList.add('active');
            
            this.currentIndex = index;
            const song = this.playlist[index];
            
            // Create a new blob from the stored data if needed
            if (song.data && !song.url.startsWith('blob:')) {
                const blob = this.dataURLtoBlob(song.data);
                song.url = URL.createObjectURL(blob);
            }
            
            this.audioPlayer.src = song.url;
            this.currentSongDisplay.textContent = song.name;
            this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.audioPlayer.play();
            this.isPlaying = true;

            // Update shuffle history if shuffle is on and this is a new selection
            if (this.isShuffleOn && index !== this.shuffleHistory[this.shuffleIndex]) {
                this.shuffleHistory = this.shuffleHistory.slice(0, this.shuffleIndex + 1);
                this.shuffleHistory.push(index);
                this.shuffleIndex = this.shuffleHistory.length - 1;
            }

            const artwork = document.querySelector('.song-artwork');
            artwork.classList.add('playing');
        }
    }

    togglePlay() {
        if (this.playlist.length === 0) return;

        const artwork = document.querySelector('.song-artwork');
        
        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            artwork.classList.remove('playing');
        } else {
            this.audioPlayer.play();
            this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            artwork.classList.add('playing');
        }
        this.isPlaying = !this.isPlaying;
    }

    playPrevious() {
        if (this.playlist.length === 0) return;

        if (this.isShuffleOn) {
            if (this.shuffleIndex > 0) {
                this.shuffleIndex--;
                this.loadSong(this.shuffleHistory[this.shuffleIndex]);
            }
        } else {
            let newIndex = this.currentIndex - 1;
            if (newIndex < 0) {
                newIndex = this.repeatMode === 'all' ? this.playlist.length - 1 : 0;
            }
            this.loadSong(newIndex);
        }
    }

    playNext() {
        if (this.playlist.length === 0) return;

        if (this.repeatMode === 'one') {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
            return;
        }

        if (this.isShuffleOn) {
            // If we're not at the end of shuffle history
            if (this.shuffleIndex < this.shuffleHistory.length - 1) {
                this.shuffleIndex++;
                this.loadSong(this.shuffleHistory[this.shuffleIndex]);
            } else {
                // Get available indices excluding current song
                let availableIndices = [...Array(this.playlist.length).keys()]
                    .filter(i => i !== this.currentIndex);
                
                if (availableIndices.length === 0) {
                    if (this.repeatMode === 'all') {
                        availableIndices = [...Array(this.playlist.length).keys()];
                    } else {
                        this.stopPlayback();
                        return;
                    }
                }

                // Pick random song from available
                const randomIndex = Math.floor(Math.random() * availableIndices.length);
                const nextIndex = availableIndices[randomIndex];
                
                // Add to history
                this.shuffleHistory.push(nextIndex);
                this.shuffleIndex++;
                
                this.loadSong(nextIndex);
            }
        } else {
            let newIndex = this.currentIndex + 1;
            if (newIndex >= this.playlist.length) {
                if (this.repeatMode === 'all') {
                    newIndex = 0;
                } else {
                    this.stopPlayback();
                    return;
                }
            }
            this.loadSong(newIndex);
        }
    }

    updateProgress() {
        if (!this.audioPlayer.duration) return;
        
        const duration = this.audioPlayer.duration;
        const currentTime = this.audioPlayer.currentTime;
        const progressPercent = (currentTime / duration) * 100;
        
        // Update progress bar width
        this.progress.style.width = `${progressPercent}%`;
        
        // Update time displays
        this.currentTimeDisplay.textContent = this.formatTime(currentTime);
        this.durationDisplay.textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Helper function to convert base64 to Blob
    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    removeSong(index) {
        if (index >= 0 && index < this.playlist.length) {
            // If the current song is being removed
            if (index === this.currentIndex) {
                this.audioPlayer.pause();
                this.isPlaying = false;
                this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
                this.currentSongDisplay.textContent = 'No song selected';
            }

            // Revoke the URL to free up memory
            if (this.playlist[index].url) {
                URL.revokeObjectURL(this.playlist[index].url);
            }

            // Remove the song from playlist
            this.playlist.splice(index, 1);
            
            // Save the updated playlist
            this.savePlaylist();
            
            // Update the display
            this.updatePlaylistDisplay();

            // Adjust currentIndex if necessary
            if (this.currentIndex > index) {
                this.currentIndex--;
            } else if (this.currentIndex >= this.playlist.length) {
                this.currentIndex = Math.max(0, this.playlist.length - 1);
            }
        }
    }

    updatePlaylistDisplay() {
        // Clear the current playlist display
        this.songList.innerHTML = '';
        
        // Rebuild the playlist display
        this.playlist.forEach((song, index) => {
            const li = document.createElement('li');
            
            // Create song name span
            const nameSpan = document.createElement('span');
            nameSpan.textContent = song.name;
            nameSpan.className = 'song-name';
            
            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.className = 'delete-song';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent song from playing when clicking delete
                this.removeSong(index);
            };
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            li.addEventListener('click', () => this.loadSong(index));
            
            this.songList.appendChild(li);
        });
    }

    initializeProgressBar() {
        const tooltip = document.createElement('div');
        tooltip.className = 'time-tooltip';
        this.progressBar.appendChild(tooltip);

        this.progressBar.addEventListener('mousemove', (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const time = pos * this.audioPlayer.duration;
            
            tooltip.textContent = this.formatTime(time);
            tooltip.style.left = `${e.clientX - rect.left}px`;
            tooltip.style.opacity = '1';
        });

        this.progressBar.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });

        this.progressBar.addEventListener('click', (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.audioPlayer.currentTime = pos * this.audioPlayer.duration;
        });
    }

    updateVolumeDisplay(value) {
        const volumeIcon = document.querySelector('.volume-control i');
        const volumeTooltip = document.querySelector('.volume-tooltip');
        const volumeLevel = document.querySelector('.volume-level');
        const volumeSlider = document.querySelector('.volume-slider');
        const volumeControl = document.querySelector('.volume-control');
        
        // Update audio volume
        this.audioPlayer.volume = value / 100;
        
        // Update volume slider value
        this.volumeSlider.value = value;
        
        // Update volume bar color
        this.volumeSlider.style.setProperty('--volume-percentage', `${value}%`);
        
        // Update tooltip
        volumeTooltip.textContent = `${value}%`;
        
        // Update volume dots
        const dots = document.querySelectorAll('.volume-dot');
        const dotThreshold = 100 / (dots.length - 1);
        
        dots.forEach((dot, index) => {
            const dotValue = dotThreshold * index;
            if (value >= dotValue) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update volume states and colors
        if (value == 0) {
            volumeIcon.className = 'fas fa-volume-mute';
            volumeLevel.textContent = 'Muted';
            volumeLevel.setAttribute('data-level', 'muted');
            volumeSlider.setAttribute('data-volume', 'muted');
            volumeControl.setAttribute('data-volume', 'muted');
        } else if (value < 30) {
            volumeIcon.className = 'fas fa-volume-off';
            volumeLevel.textContent = 'Low';
            volumeLevel.setAttribute('data-level', 'low');
            volumeSlider.setAttribute('data-volume', 'low');
            volumeControl.setAttribute('data-volume', 'low');
        } else if (value < 70) {
            volumeIcon.className = 'fas fa-volume-down';
            volumeLevel.textContent = 'Medium';
            volumeLevel.setAttribute('data-level', 'medium');
            volumeSlider.setAttribute('data-volume', 'medium');
            volumeControl.setAttribute('data-volume', 'medium');
        } else {
            volumeIcon.className = 'fas fa-volume-up';
            volumeLevel.textContent = 'High';
            volumeLevel.setAttribute('data-level', 'high');
            volumeSlider.setAttribute('data-volume', 'high');
            volumeControl.setAttribute('data-volume', 'high');
        }

        // Add glow effect to volume icon
        volumeIcon.style.textShadow = value === 0 ? 
            '0 0 10px rgba(255, 0, 0, 0.6)' : 
            '0 0 10px rgba(0, 184, 148, 0.6)';
    }

    toggleRepeat() {
        switch (this.repeatMode) {
            case 'none':
                this.repeatMode = 'one';
                break;
            case 'one':
                this.repeatMode = 'all';
                break;
            case 'all':
                this.repeatMode = 'none';
                break;
        }
        this.updateRepeatButtonState();
    }

    updateRepeatButtonState() {
        // Remove all classes first
        this.repeatBtn.classList.remove('repeat-one', 'repeat-all', 'active');
        
        switch (this.repeatMode) {
            case 'one':
                this.repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i><span>1</span>';
                this.repeatBtn.classList.add('repeat-one', 'active');
                break;
            case 'all':
                this.repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
                this.repeatBtn.classList.add('repeat-all', 'active');
                break;
            default:
                this.repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
                break;
        }
    }

    toggleShuffle() {
        this.isShuffleOn = !this.isShuffleOn;
        this.updateShuffleButtonState();
        
        // Reset shuffle history when turning shuffle on
        if (this.isShuffleOn) {
            this.shuffleHistory = [this.currentIndex];
            this.shuffleIndex = 0;
        }
    }

    updateShuffleButtonState() {
        if (this.isShuffleOn) {
            this.shuffleBtn.classList.add('active');
            this.shuffleBtn.setAttribute('data-tooltip', 'Shuffle On');
        } else {
            this.shuffleBtn.classList.remove('active');
            this.shuffleBtn.setAttribute('data-tooltip', 'Shuffle Off');
        }
    }

    stopPlayback() {
        this.audioPlayer.pause();
        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.querySelector('.song-artwork').classList.remove('playing');
    }
}

// Initialize the music player
const player = new MusicPlayer();

// Clear playlist when window is closed
window.addEventListener('beforeunload', () => {
    localStorage.removeItem('playlist');
}); 