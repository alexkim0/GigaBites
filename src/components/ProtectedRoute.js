// import { Navigate } from "react-router-dom";
// import { doc, getDoc } from "firebase/firestore";
// import { useAuth } from "../hooks/AuthProvider";
// import { db } from "../config/firebase-config";

// const ProtectedRoute = ({ user, children }) => {
//   const userDocRef = doc(db, "user", user.uid);
//   const userSnap = getDoc(userDocRef);
//   const userData = userSnap.data();

//   if (!user) {
//     return <Navigate to="/login" replace />;
//   } else if (userData.user_pref && Object.keys(userData.user_pref).length > 0) {
//     return <Navigate to="/feed" replace />
//   }
//   return children;
// };

// export default ProtectedRoute;

import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthProvider";


const ProtectedRoute = ({ children, redirectIfPref = null, redirectIfName = null }) => {
  const { currentUser, loading } = useAuth();

  // Show loading state while auth / Firestore data is being fetched
  if (loading) return <p>Loading...</p>;

  // Redirect to login if not authenticated
  if (!currentUser) return <Navigate to="/login" replace />;

  // Redirect if user_pref exists and redirectIfPref is provided
  if (
    redirectIfPref &&
    currentUser.userData?.user_pref &&
    Object.keys(currentUser.userData.user_pref).length > 0
  ) {
    return <Navigate to={redirectIfPref} replace />;
  }

  if (
    redirectIfName &&
    currentUser.userData?.user_name?.trim()
  ) {
    return <Navigate to={redirectIfName} replace />;
  }

  // Otherwise, render the protected page
  return children;
};

export default ProtectedRoute;

// import { Navigate, useLocation } from "react-router-dom";
// import { useAuth } from "../hooks/AuthProvider";
// import { useEffect, useState } from "react";

// const ProtectedRoute = ({ children, redirectIfPref = null, redirectIfName = null }) => {
//   const { currentUser, loading } = useAuth();
//   const location = useLocation(); // Detect route changes
//   const [redirectTo, setRedirectTo] = useState(null);

//   // Check redirect conditions on currentUser or location change
//   useEffect(() => {
//     if (!currentUser) return;

//     if (redirectIfPref && currentUser.userData?.user_pref?.length > 0) {
//       setRedirectTo(redirectIfPref);
//     } else if (redirectIfName && currentUser.userData?.user_name?.trim()) {
//       setRedirectTo(redirectIfName);
//     } else {
//       setRedirectTo(null);
//     }
//   }, [currentUser, location, redirectIfPref, redirectIfName]);

//   if (loading) return <p>Loading...</p>;
//   if (!currentUser) return <Navigate to="/login" replace />;
//   if (redirectTo) return <Navigate to={redirectTo} replace />;

//   return children;
// };

// export default ProtectedRoute;