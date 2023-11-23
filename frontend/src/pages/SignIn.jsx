import React from 'react'
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import './Form.css'


const SignIn = () => {
const registrationSchema = Yup.object().shape({
  email: Yup.string().email('Please enter a valid email address').required('Please enter your Email address'),
  password: Yup.string().min(8, 'Password must be at least 8 characters long').required('Please enter a Password'),
  
});
 const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: registrationSchema,
    onSubmit: (values) => {
      console.log('Submitting form data:', values);
    },
  });
    return(
  <React.Fragment>
    <form onSubmit={formik.handleSubmit} className='sign_in_form'>
         
         <header className='sign_in_form_header'>
                <h1>Sign In! 👋</h1>
                <p className='text-sm mt-5' style={{color: "#757575"}}>Lets pick up from where we left off. Login now!</p>
        </header>

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


    
      <button className='sign_in_btn' type="submit">Continue</button>

      <small className='block text-center mt-5' style={{color: "#757575"}}>Not registered yet? <Link style={{color: "#363eff", fontWeight: "bold"}} to='/signup'>Create an Account</Link></small>
    </form>
    </React.Fragment>
  )
}

export default SignIn





  


