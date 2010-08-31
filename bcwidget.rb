require 'net/http'
require 'rubygems'
require 'sinatra'
require 'json'
begin
  require 'active_support'
rescue
  require 'activesupport'
end

APP_URL = 'http://bc-timer.heroku.com'
GIST_URL   = 'http://gist.github.com/%s.txt'
GIST_CREATE_URL = 'http://gist.github.com/gists'

set :haml, {:format => :html5}

#enable  :sessions
use Rack::Session::Cookie, 
:key => 'rack.session',
:domain => 'bcwidget.heroku.com',
:path => '/',
:expire_after => (60 * 60 * 24), # one day
:secret => 'bcwidget'

get '/chrome' do
  haml :chrome
end

def download(host, path, query_string, usr = nil, pwd = '')
  if query_string != ""
    path += "?" + query_string
  end
  body = nil
  puts "#{host} #{path} #{usr}"
  Net::HTTP.start(host) do |http|
    req = Net::HTTP::Get.new(path)
    req.basic_auth usr, pwd if usr
    response = http.request(req)
    body  = response.body
  end  
  puts body
  body
end

def download_xml2json(host, path, query, usr = nil, pwd = '')
  body = download(host, path, query, usr, pwd)
  Hash.from_xml(body).to_json
end

get '/basecamp/:domain/:token/*' do
  domain = params[:domain]
  token = params[:token]
  host = domain + '.basecamphq.com'
  path = '/'+params[:splat].first
  content_type :json
  download_xml2json host, path, request.query_string, token
end

get '/download/:mime/:type/*' do
  content_type params[:mime]+"/"+params[:type]
  download params[:splat].first, request.query_string
end


get '/download/*' do 
  download params[:splat].first, request.query_string
end


['/gmail.xml', '/:domain/gmail.xml', '/:domain/:token/gmail.xml'].each { |p| 
  get(p) { content_type :xml; haml :gmail } 
}

['/', '/:domain/?', '/:domain/:token/?'].each { |p| get(p) { haml :index } }
