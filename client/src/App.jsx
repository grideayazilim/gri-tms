import "./App.scss";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar/Navbar";
import TestLogin from "./TestLogin";
import {
  LoginPage,
  protectedRoutes,
  adminRoutes,
  notFoundRoute,
} from "./routes";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        {/* Login Page */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Routes>
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
              </>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Test Login */}
      <TestLogin />
    </>
  );
}

export default App;
