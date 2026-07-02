import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from './pages/landingPage';
import AuthPage from './pages/AuthPage';
import PostsPage from './pages/PostsPage';

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element ={<LandingPage />} />
        <Route path="/auth" element ={<AuthPage />} />
        <Route path="/posts" element ={<PostsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;