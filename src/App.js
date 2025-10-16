  // import { useEffect, useState } from "react";
  import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
  // import logo from './logo.svg';
  import './App.css';
  // import { db } from './config/firebase-config';
  // import { getDocs, collection } from 'firebase/firestore';
  import { useAuth } from "./hooks/AuthProvider";
  import ProtectedRoute from "./components/ProtectedRoute";


  import { SignUp } from "./pages/signUp/SignUp";
  import { Login } from "./pages/login/LogIn"
  import { Homepage } from "./pages/homepage/Homepage"
  import { Feed } from "./pages/feedpage/Feedpage";

  function App() {
    // const [testList, setTestList] = useState([]);

    // // reference of the Business data collection in firestore
    // const businessCollectionRef = collection(db, "Test");

    // useEffect(() => {
    //   const getTestList = async () => {
    //     // READ THE DATA
    //     // SET THE BUSINESS LIST
    //     try {
    //       const data = await getDocs(businessCollectionRef);
    //       // filtering data
    //       const filteredData = data.docs.map((doc) => ({
    //         ...doc.data(), id: doc.id
    //       }));
          
    //       setTestList(filteredData);
    //       // print the data
    //       console.log(filteredData)
    //     } catch (err) {
    //       console.error(err);
    //     }
    //   };

    //   getTestList();
    // }, [])

    // const [showTests, setShowTests] = useState(false);

    const { currentUser, loading } = useAuth();

    if (loading) {
      return <p>Loading...</p>;
    }

    return (
      <Router>
        <Routes>
          <Route
            path="/"
            element={currentUser ? <Navigate to="/homepage" /> : <Login />}
          />
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/homepage" /> : <Login />}
          />
          <Route path="/signup" element={<SignUp/>}/>
          <Route
            path="/homepage"
            element={
              <ProtectedRoute user={currentUser}>
                <Homepage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute user={currentUser}>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    );
  }

  export default App;
