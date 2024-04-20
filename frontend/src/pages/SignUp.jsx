import React from 'react'
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import './Form.css'
import axios from "axios"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const SignUp = () => {
 

   const handleUserReg = async (values) => {
    try{
      let url = 'https://diagnosy-api.mikerock.tech/users'
      let response = await axios.post(url, values, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
          },
      })
      toast.success('Sign Up successful', { autoClose: 2000 });
      
      formik.resetForm();
      console.log(response.data)
    }catch(error){
      console.log(error)
    }
  } 
const registrationSchema = Yup.object().shape({
  username: Yup.string().required('Please enter your Name'),
  email: Yup.string().email('Please enter a valid email address').required('Please enter your Email address'),
  password: Yup.string().min(8, 'Password must be at least 8 characters long').required('Please enter a Password'),
  // confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match').required('Please Confirm your Password'),
});
 const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      // confirmPassword: '',
    },
    validationSchema: registrationSchema,
    onSubmit: (values) => {
    handleUserReg(values)
    console.log(values)
    },
  });
    return(
  <React.Fragment>
    <form onSubmit={formik.handleSubmit} className='sign_up_form'>
         <header className='sign_up_form_header'>
                <h1>Sign Up! 👋</h1>
                <ToastContainer/>
                <p className='text-sm mt-5'>Sign up for free and start using our app today</p>
        </header>
    
    <div className="form-group">
      <label htmlFor="name">Name</label>
      <input type="text" id="username" name="username" value={formik.values.username} onChange={formik.handleChange} placeholder='Your Name' />
      {formik.errors.username && <div style={{color: "red"}}>{formik.errors.username}</div>}
    </div>

    <div className="form-group">
      <label htmlFor="email">Email</label>
      <input type="email" id="email" name="email" value={formik.values.email} onChange={formik.handleChange} placeholder='Your Email'/>
      {formik.errors.email && <div style={{color: "red"}}>{formik.errors.email}</div>}
        </div>

    <div className="form-group">
      <label htmlFor="password">Password</label>
      <input type="password" id="password" name="password" value={formik.values.password} onChange={formik.handleChange} placeholder='Password must be 8 characters'/>
      {formik.errors.password && <div style={{color: "red"}}>{formik.errors.password}</div>}
    </div>

        {/* <div className="form-group">
      <label htmlFor="confirmPassword">Confirm Password</label>
      <input type="password" id="confirmPassword" name="confirmPassword" value={formik.values.confirmPassword} onChange={formik.handleChange} />
      {formik.errors.confirmPassword && <div style={{color: "red"}}>{formik.errors.confirmPassword}</div>}
        </div> */}


     <div className="flex items-center mb-5">
        <input type="radio" />
        <span className='ml-2' style={{color: "#757575"}}>By sigining up, you agree to the <Link to="#" style={{color: "#0c52cb"}}>Terms of Service and Privacy Policy</Link> </span>
    </div>
      <button className='forms_btn mb-5' type="submit">Continue</button>

      <small className='block text-center mt-5' style={{color: "#757575"}}>Already have an account? <Link style={{color: "#363eff", fontWeight: "bold"}} to='/login'>Login</Link></small>
    </form>
    </React.Fragment>
  )
}

export default SignUp





  


