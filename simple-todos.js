/* exported Tasks */

Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
  // This code only runs on the server

  /**
   * Only publish tasks that aer public or belong to the current user
   */
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    /**
     * Returns all tasks for a logged in user.
     * Dos not display any hidden tasks.
     * @returns {any.Cursor} The tasks.
     */
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    /**
     * Returns true if the completed tasks should be hidden.
     * @returns {any} Whether the completed tasks should be hidden.
     */
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    /**
     * Returns the count of tasks not yet checked completed.
     * @returns {any} The number of tasks.
     */
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({

    /**
     * Creates and saves a new task.
     * @param event The browser event when the user clicks to create a new task.
     */
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";
    },
    /**
     * Set the state of the hideCompleted variable.
     * @param event The event indicating whether the user checked or unchecked the box.
     */
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({

    /**
     * Returns true if the current user is the owner of this task.
     * @returns {boolean} True if the user owns this task.
     */
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    /**
     * Set the checked property of the current task.
     */
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    /**
     * Delete the current task.
     */
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    /**
     * Set the current task to priate.
     */
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  /**
   * Creates a new task if the current user is logged in.
   * @param text The task name.
   */
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  /**
   * Deletes the taskID if the current user is logged in.
   * If the task is private, then only the owning user can delete it.
   * @param taskId
   */
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  /**
   * Allows logged in users to set tasks to checked.
   * Private tasks can only be updated to their owner.
   * @param taskId The task ID.
   * @param setChecked The new value of setChecked.
   */
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  /**
   * Allows the owner of a task to set it as private status.
   * @param taskId The task ID.
   * @param setToPrivate The new privacy value.
   */
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});