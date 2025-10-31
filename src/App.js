  // import { useEffect, useState } from "react";
  import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
  import { Toaster } from "react-hot-toast";
  // import logo from './logo.svg';
  import './App.css';
  // import { db } from './config/firebase-config';
  // import { getDocs, collection } from 'firebase/firestore';
  import { useAuth } from "./hooks/AuthProvider";
  import ProtectedRoute from "./components/ProtectedRoute";
  import logo from './assets/logo.png';


  import { SignUp } from "./pages/signUp/SignUp";
  import { Login } from "./pages/login/LogIn"
  import { Homepage } from "./pages/homepage/Homepage"
  import { Feed } from "./pages/feedpage/Feedpage";
  import { ProfileCreation } from "./pages/profileCreation/ProfileCreation";
  import { Profilepage } from "./pages/profilepage/Profilepage";
  import { Createpage } from "./pages/createpage/Createpage"
  import { Postpage } from "./pages/postpage/Postpage";

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
        <Toaster position="top-right"/>
        <div className="app">
          <header className="logo-header">
            <Link to ="/feed">
              <img src={logo} className="logo" alt="logo" />
            </Link>
          </header>

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
                <ProtectedRoute redirectIfPref={"/profileCreation"}>
                  <Homepage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profileCreation"
              element={
                <ProtectedRoute redirectIfName={"/feed"}>
                  <ProfileCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profilepage/:uid"
              element={
                <ProtectedRoute>
                  <Profilepage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/createpage"
              element={
                <ProtectedRoute>
                  <Createpage/>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/postpage/:postId" 
              element={
                <ProtectedRoute>
                  <Postpage/>
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    );
  }

  export default App;
