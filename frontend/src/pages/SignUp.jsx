import React from 'react'
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import './Form.css'


const SignUp = () => {
const registrationSchema = Yup.object().shape({
  name: Yup.string().required('Please enter your Name'),
  email: Yup.string().email('Please enter a valid email address').required('Please enter your Email address'),
  password: Yup.string().min(8, 'Password must be at least 8 characters long').required('Please enter a Password'),
  confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match').required('Please Confirm your Password'),
});
 const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: registrationSchema,
    onSubmit: (values) => {
      console.log('Submitting form data:', values);
    },
  });
    return(
  <React.Fragment>
    <form onSubmit={formik.handleSubmit} className='sign_up_form'>
         
         <header className='sign_up_form_header'>
                <h1>Sign Up! 👋</h1>
                <p className='text-sm mt-5'>Sign up for free and start using our app today</p>
        </header>
    
    <div className="form-group">
      <label htmlFor="name">Name</label>
      <input type="text" id="name" name="name" value={formik.values.name} onChange={formik.handleChange} placeholder='Your Name' />
      {formik.errors.name && <div style={{color: "red"}}>{formik.errors.name}</div>}
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

        <div className="form-group">
      <label htmlFor="confirmPassword">Confirm Password</label>
      <input type="password" id="confirmPassword" name="confirmPassword" value={formik.values.confirmPassword} onChange={formik.handleChange} />
      {formik.errors.confirmPassword && <div style={{color: "red"}}>{formik.errors.confirmPassword}</div>}
        </div>


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





  


