
import { useEffect, useState } from "react";
// import logo from './logo.svg';
import './App.css';
import { db } from './config/firebase-config';
import { getDocs, collection } from 'firebase/firestore';
import { Auth } from "./pages/login/LoginSignup";

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
    <div>

      <div><Auth/></div>
       
      {/* <button onClick={() => setShowTests(!showTests)}>{showTests ? "Hide Test Datas" : "Show Test Datas"}</button>

      {showTests && (
        <div>
          {testList.map((test) => (
            <div>
              <h1> First Name: {test.firstName} </h1>
              <h1> Last Name: {test.lastName}</h1>
              <h1> ID: {test.id}</h1>
            </div>
          ))}
        </div>
      )} */}

    </div>

  );
}

export default App;
