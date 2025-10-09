
  import { useEffect, useState } from "react";
  import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
  // import logo from './logo.svg';
  import './App.css';
  import { db } from './config/firebase-config';
  import { getDocs, collection } from 'firebase/firestore';
  import { SignUp } from "./pages/signUp/SignUp";
  import { Login } from "./pages/login/LogIn"

  function App() {
    const [testList, setTestList] = useState([]);

    // reference of the Business data collection in firestore
    const businessCollectionRef = collection(db, "Test");

    useEffect(() => {
      const getTestList = async () => {
        // READ THE DATA
        // SET THE BUSINESS LIST
        try {
          const data = await getDocs(businessCollectionRef);
          // filtering data
          const filteredData = data.docs.map((doc) => ({
            ...doc.data(), id: doc.id
          }));
          
          setTestList(filteredData);
          // print the data
          console.log(filteredData)
        } catch (err) {
          console.error(err);
        }
      };

      getTestList();
    }, [])

    const [showTests, setShowTests] = useState(false);

    return (
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp/>}/>
        </Routes>
      </Router>
    );
  }

  export default App;
