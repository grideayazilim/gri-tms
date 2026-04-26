/* ========================================================================
   APP COMPONENT (ANA UYGULAMA BİLEŞENİ)
   Route tanımlamaları, Navbar ve genel layout yapısı.
   ======================================================================== */
import "./App.scss";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ModalProvider } from "./components/Modal";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar/Navbar";
import { AnimatePresence } from "framer-motion";
import {
  publicRoutes,
  protectedRoutes,
  adminRoutes,
  notFoundRoute,
} from "./routes";


function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <ModalProvider>
      <div className="app">
        <Routes>
          {/* Public Routes (Auth) */}
          {publicRoutes.map(({ path, element: Element }) => (
        <Route
              key={path}
              path={path}
          element={
                isAuthenticated ? <Navigate to="/" replace /> : <Element />
          }
        />
          ))}

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
                <div className="app-content">
                <Navbar />
                  <div className="app-content__main">
                  <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  {/* Herkesin erişebileceği sayfalar */}
                  {protectedRoutes.map(({ path, element: Element }) => (
                    <Route key={path} path={path} element={<Element />} />
                  ))}

                  {/* Sadece admin'in erişebileceği sayfalar */}
                  {adminRoutes.map(({ path, element: Element }) => (
                    <Route
                      key={path}
                      path={path}
                      element={
                        <ProtectedRoute adminOnly>
                          <Element />
                        </ProtectedRoute>
                      }
                    />
                  ))}

                  {/* 404 - Catch all */}
                  <Route
                    path={notFoundRoute.path}
                    element={<notFoundRoute.element />}
                  />
                </Routes>
                  </AnimatePresence>
                  </div>
                </div>
            </ProtectedRoute>
          }
        />
      </Routes>
      </div>
    </ModalProvider>
  );
}

export default App;
