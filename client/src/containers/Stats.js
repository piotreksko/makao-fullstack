import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { withFirebase, isLoaded} from 'react-redux-firebase'
 
const Todos = ({ firebase }) => {
  // Build Todos list if todos exist and are loaded
  const stats = !isLoaded(stats)
    ? 'Loading'
      : Object.keys(todos).map(
          (key, id) => <TodoItem key={key} id={id} todo={todos[key]}/>
        )
  return (
    <div>
      <h1>Todos</h1>
      <ul>
        {todosList}
      </ul>
      <button onClick={() => firebase.watchEvent('value', 'todos')}>
        Load Todos
      </button>
    </div>
  )
}
 
export default compose(
  withFirebase, 
  connect((state) => ({
    todos: state.firebase.data.winCounter,
    // profile: state.firebase.profile // load profile
  }))
)(Todos)