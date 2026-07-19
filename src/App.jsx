import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from './pages/landingPage';
import AuthPage from './pages/AuthPage';
import PostsPage from './pages/PostsPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { SavedGamesProvider } from './contexts/SavedGamesContext';

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element ={<LandingPage />} />
        <Route path="/auth" element ={<AuthPage />} />
        <Route
          path="/posts"
          element={
            <SavedGamesProvider>
              <PostsPage />
            </SavedGamesProvider>
          }
        />
        <Route path="/change-password" element ={<ChangePasswordPage />} />
        <Route path="/reset-password" element ={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;