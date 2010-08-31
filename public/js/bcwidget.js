(function ($) {

  var account;
  var me;

  var domain;
  var token;

  var projects;
  var current_project;
  var people = {};
  var task_awaiting_project;
  var today_project;

  var param = function (name) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]")
    var regexS = "[\\?&]"+name+"=([^&#]*)"
    var regex = new RegExp(regexS)
    var results = regex.exec( window.location.href )
    if( results == null )
      return null
    else
      return results[1]
  }

  var cookie = function(name, val){
    if(val == null) {
      return $.removeCookie(name);
    }
    if(val){
      return $.setCookie(name, val);
    }
    val = $.cookie(name)
    if(_.isUndefined(val) || val == null) {
      return null;
    }
    return val
  }

  var basecamp = function(thing, withDomain, withToken) {
    withDomain = withDomain || domain 
    withToken = withToken || token 
    return '/basecamp/' + withDomain + '/' + withToken + '/' + thing
  }

  var initInFieldLabels = function(){
    var toggleLabel = function (event) {
      field = $(this)
      var name = field.attr('name')
      var label = field.parent().find('label[for="'+name+'"]')
      if(field.val() === ''){
        label.show()
      } else {
        label.hide()
      }
    }
    $('.infieldLabel > label').bind({
      mouseover: function() { $(this).hide() }
    });
    $('.infieldLabel > input').bind({
      mouseover: function () { $(this).focus(); }, 
      mouseout: toggleLabel,
      keyup: toggleLabel
    });
    $('.infieldLabel > input').trigger('mouseout')
  }

  var styleForms = function () {
    $('#themes').themeswitcher({
      loadTheme: 'Redmond'
    })
    $('.ui-icon-image').click(function(){
      $('.jquery-ui-themeswitcher-trigger').trigger('click')
    })
    initInFieldLabels()
    $(':checkbox[name="remember"]').iphoneStyle({
      checkedLabel: 'Remember me',
      uncheckedLabel: 'Manual login',
      resizeContainer: true,
      resizeHandle: false 
    })
    $('a.minibutton').bind({ 
      mousedown: function() {$(this).addClass('mousedown');}, 
      blur: function() {$(this).removeClass('mousedown');}, 
      mouseup: function() {$(this).removeClass('mousedown');}
    })
    $('.ui-button').bind({ 
      mousedown: function() {$(this).addClass('ui-state-active');}, 
      blur: function() {$(this).removeClass('ui-state-active');}, 
      mouseup: function() {$(this).removeClass('ui-state-active');},
      mouseover: function(){$(this).addClass('ui-state-hover')},
      mouseout: function(){$(this).removeClass('ui-state-hover')}
    })
  }

  var bindEvents = function () {
    $ ('.login a.minibutton').bind ({
      click: function () {
        var loginDomain = $('.login input[name="domain"]').val()
        var loginToken = $('.login input[name="token"]').val()
        if(loginDomain === '' || loginToken === '') { 
          notifyError('Enter domain and token', {style: 'width:10em'})
        } else {
          var mustSave = $('.login input[name="remember"]').is(':checked')
          tryLogin(loginDomain, loginToken, mustSave)
        }
      }
    })

    $('a[href|=#page]').live('click', function(event){
      event.preventDefault()
      var i = $(this).attr('href').substring(6)
      gotoPage(parseInt(i))
    })
    
    $('.pageLinks > div').live('mouseenter',  function() {
      $(this).addClass('ui-state-hover')
    })
    $('.pageLinks > div').live('mouseleave',  function() {
      $(this).removeClass('ui-state-hover')
    })
    $('.menu .ui-icon-home').click(gotoHome)
    $('.projects > .added').live('click',  function() {
      var project = $(this).get(0).project
      if(task_awaiting_project) {
        task_awaiting_project(project)
      } else {
        loadProject(project)
      }
    })
    $('.tasklists > .added').live('click',  function() {
      var todo_list = $(this).get(0).todo_list
      loadTodoList(todo_list)
    })
    $('.todos > .added').live('click', function() {
      var todo = $(this).get(0).todo
      showToday()
      addTodayTask(todo.content, true, current_project)
    })
    $('.today-button').click(showToday)
    $('.home-button').click(gotoHome)
    $('.todos-button').click(function(){
      if(today_project){ loadProject(today_project); } 
    })
    $('input[name="task"]').bind({
      keyup: function(event) {
        event.preventDefault()
        if(event.keyCode == 13) {
          addTodayTask($(this).val(), true)
        }
      }
    })
    setInterval(function(){
      $('.tasks .active:visible span.timer').each(function(i, timer) {
        var obj = timer.time;
        if(!obj) { obj = timer.time = Date.today() }
        obj.add({ seconds: 1 })
        $(timer).text(obj.toString('HH:mm:ss'))
      })
    }, 1000)
    $('.tasks .added').live('pause', function(){
      var added = $(this)
      added.removeClass('active').addClass('paused')
      added.find('.pause.ui-button').
        addClass('hidden').removeClass('inline')
      added.find('.resume.ui-button').
        addClass('inline').removeClass('hidden')
    })
    $('.tasks .added').live('resume', function(){
      var added = $(this)
      added.removeClass('paused').addClass('active')
      added.find('.resume.ui-button').
        addClass('hidden').removeClass('inline')
      added.find('.pause.ui-button').
        addClass('inline').removeClass('hidden')
    })
    $('.tasks .added .actions .pause.ui-button').live('click', function(){
      $(this).parent().parent().trigger('pause')
    })
    $('.tasks .added .actions .resume.ui-button').live('click', function(){
      $(this).parent().parent().trigger('resume')
    })
    $('.actions .brb.ui-button').live('click', function(){
      $('.tasks .added.active').addClass('brb').trigger('pause')
      $(this).removeClass('inline').addClass('hidden')
      $('.actions .btw.ui-button').
        removeClass('hidden').addClass('inline')
    })
    $('.actions .btw.ui-button').live('click', function(){
      $('.tasks .added.brb').removeClass('brb').trigger('resume')
      $(this).removeClass('inline').addClass('hidden')
      $('.actions .brb.ui-button').
        removeClass('hidden').addClass('inline')
    })
    $('.actions .add-task.ui-button').click(function(){
      addTodayTask()
    })
    $('.actions .today-project.ui-button').click(function(){
      today_project = current_project
      showToday()
    })
    $('.actions .today-project-goal.ui-button').click(function(){
      showToday()
      addTodayTask(null, null, current_project)
    })
    $('.basecamp-link.ui-button').click(function(){
      var url = $(this).attr('href')
      window.open(url)
    })
  }

  var gotoPage = function(i) {
    $('.mask').animate({ left: (i * -155)+"px" })
  }

  var gotoHome = function(){
    gotoPage(0)
    pageTitle('Projects  - '+me.first_name+' '+me.last_name)
  }
  
  var pageTitle = function(name, title){
    title = title || name
    $('.title').text(name)
    $('.title').attr('title', title)
  }

  var notifyError = function(msg, attrs) {
    attrs = $.extend({}, attrs || {}, {
      style: "position: absolute; top: 0px; left: 0px; margin: 10px; font-size: 2em;"
    })
    var html = $('<div></div>', attrs)
    html.html($('#template .error').html())
    html.find('.message').append(msg)
    html.purr({
      removeTimer: 1500,
      noClose: true
    })
  }

  var tryLogin = function(loginDomain, loginToken,mustSave) {
    $('.busy').show()
    $.ajax({
      url: basecamp('account.xml', loginDomain, loginToken),
      success: function(data) {
        account = data.account
        $.ajax({
          url: basecamp('people/me.xml', loginDomain, loginToken),
          success: function(data){
            $('.busy').hide()
            me = data.person
            people[me.id] = me
            loggedIn(loginDomain, loginToken)
          }
        })
      },
      error: function(){ notifyError('Login error', {style: "width: 5em" }) }
    })
        
    if(mustSave){
      cookie('domain', domain)
      cookie('token', token)
    } else {
      cookie('domain', null)
      cookie('token', null)
    }
  }
  
  var meta = function(name){
    var value = $('meta[name="'+name+'"]').attr('content')
    if(value && value !== '') {
      return value;
    }
  }

  var initLogin = function () {
    var withDomain = param('domain') || meta('domain') || cookie('domain') || ''
    var withToken = param('token') || meta('token') || cookie('token') || ''
    if(withToken) { $('.login input[name="token"]').val(withToken) }
    if(withDomain) { $('.login input[name="domain"]').val(withDomain) }
    if(withToken && withDomain) { tryLogin(withDomain, withToken) } 
  }

  var loggedIn = function (loginDomain, loginToken) {
    domain = loginDomain
    token = loginToken
    $('.login').slideUp()
    console.debug('account', account)
    console.debug('me', me)
    $('.content').fadeIn(2000)
    $('img.avatar').attr('src', me.avatar_url).
      attr('title',me.first_name+' '+me.last_name+' <'+me.email_address+'>')
    loadProjects(false)
    showToday()
  }

  var loadProjects = function(goto){
    $('.busy').show()
    $.ajax({
      url: basecamp('projects.xml'),
      success: function(data){
        $('.busy').hide()
        console.debug('projects', data)
        $('.back').removeClass('inline').addClass('hidden')
        $('.projects > .added').remove()
        if(goto) { gotoHome() } 
        projects = data.projects
        $.each(data.projects, function(i, project){
          var div = $($('.projects .template').html())
          div.get(0).project = project
          div.find('span.name').text(project.name)
          div.attr('title', 'Status: '+project.status+
                   ' - Last changed on: '+project.last_changed_on)
          $('.projects').append(div)
        })
      }
    })
  }

  var loadProject = function(project) {
    current_project = project
    $('.busy').show()
    $.ajax({
      url: basecamp('projects/'+project.id+'/todo_lists.xml'),
      success: function(data) {
        $('.busy').hide()
        console.debug(project.name,'tasklists',data)
        $('.back').removeClass('hidden').addClass('inline').
          find('a').attr('href', '#page-0').attr('title', 'Back to Projects')
        pageTitle(project.name + ' - Task Lists')
        $('.tasklists > .added').remove()
        gotoPage(1)
        var project_url = 'http://'+domain+'.basecamphq.com/projects/'+
          project.id;
        $('.open-project.basecamp-link').attr('href', project_url)
        var todo_url = 'http://'+domain+'.basecamphq.com/projects/'+
          project.id+'/todo_lists';
        $('.edit-tasklists.basecamp-link').attr('href', todo_url)
        $.each(data.todo_lists, function(i, todo_list){
          var div = $($('.tasklists .template').html())
          div.get(0).todo_list = todo_list
          div.find('span.name').text(todo_list.name)
          div.attr('title', todo_list.description)
          $('.tasklists').append(div)
        })
      }
    })
  }

  var loadTodoList = function(todo_list) {
    $('.busy').show()
    var todo_url = 'http://'+domain+'.basecamphq.com/projects/'+
      current_project.id+'/todo_lists/'+todo_list.id;
    $('.edit-tasks.basecamp-link').attr('href', todo_url)
    $.ajax({
      url: basecamp('todo_lists/'+todo_list.id+'/todo_items.xml'),
      success: function(data){
        $('.busy').hide()
        console.debug('todo_list', data)
        $('.back').removeClass('hidden').addClass('inline').
          find('a').attr('href', '#page-1').attr('title', 'Back to '+current_project.name)
        pageTitle(todo_list.name, todo_list.description)
        gotoPage(2)
        $('.todos > .added').remove()
        $.each(data.todo_items, function(i, todo) {
          var div = $($('.todos .template').html())
          div.get(0).todo = todo
          div.find('span.name').text(todo.content)
          $('.todos').append(div)        
        })
        $('.todos').sortable().disableSelection()
      }
    })
  }

  var showToday = function() {
    pageTitle('Tasks for '+Date.today().toString('d-MMM-yyyy'))
    $('.back').removeClass('inline').addClass('hidden')
    gotoPage(3)
  }

  var addTodayTask = function(name, pauseActive, project) {
    var input = $('input[name="task"]')
    name = name || input.val()
    project = project || today_project || addTodayTask.project
    addTodayTask.project = null
    if(name === '') { 
      notifyError('Please enter a task name')
      if(project) {
        addTodayTask.project = project
      }
      return 
    } 
    input.val('')
    input.trigger('mouseout')
    if(!project) {
      gotoHome()
      notifyError('Select project for actitivy')
      task_awaiting_project = function(project){
        showToday()
        addTodayTask(name, pauseActive, project)
      }
      return
    }
    task_awaiting_project = null;
    var div = $($('.tasks .template').html())
    div.find('span.name').text(name)
    if(pauseActive) { $('.tasks .added.active').trigger('pause') }
    $('.tasks').prepend(div).sortable().disableSelection()    
    console.debug($('.tasks .template').html())
    div.trigger('resume')
    div.get(0).project = project;
    div.find('.actions .project.ui-button').
      attr('title', project.name).
      click(function() {
        loadProject(project)
      })
  }
 

  var init = function () {
    initLogin()
    bindEvents()
    styleForms()
  }
  
  $(document).ready(init)

})(jQuery)
