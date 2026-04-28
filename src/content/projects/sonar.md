---
title: Sonar
description: A fancy music recommendation engine!
tags: [Rust, TypeScript, Spotify, linfa]
images:
  - /images/projects/sonar/big-layout.png
  - /images/projects/sonar/fullscreen.png
  - /images/projects/sonar/main.png
  - /images/projects/sonar/login.png
  - /images/projects/sonar/library_select.png
githubUrl: https://github.com/elwqnn/sonar
year: "2026"
order: 3
accentColor: "#FABD2F"
---

I created Sonar to discover how music profiles and recommendations work. It lets you connect to your Spotify account and pick playlists to train on. The recommendation logic runs in Rust using [linfa](https://github.com/rust-ml/linfa), applying k-means clustering to audio features extracted from your tracks to identify preference profiles. The result is a set of recommendations, with near-zero CPU and memory overhead.  
It also has an embedded music player and some other cool features.
